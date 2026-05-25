const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { successResponse, errorResponse, paginateData, transformarProducto, transformarProductos } = require('../utils/helpers');
const Review = require('../models/Review');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { cleanupUploadedFiles } = require('../services/localMediaStorage');
const {
  buildMediaFromUploads,
  syncLegacyImagesFromMedia,
  ensureMediaFromLegacy,
  parseMediaOrderField,
  parseRemovedMediaIds,
  reorderMedia,
  removeMediaByIds,
} = require('../services/productMediaService');
const {
  coerceNumber,
  normalizeVariantsInput,
  validateStockPolicy,
} = require('../services/productStockService');

const PUBLIC_PRODUCT_STATUSES = ['approved', 'aprobado'];
const MERCHANT_VISIBLE_STATUSES = ['pending', 'approved', 'rejected', 'suspended', 'pendiente', 'aprobado', 'rechazado', 'suspendido', 'pausado', 'agotado'];

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function structuredError(res, status, code, message, detalles = null) {
  const body = {
    exito: false,
    success: false,
    codigo: code,
    code,
    mensaje: message,
    message,
  };
  if (detalles && process.env.NODE_ENV === 'development') {
    body.detalles = detalles;
  }
  return res.status(status).json(body);
}

function applyUploadedMedia(datosProducto, req) {
  const imageFiles = req.productImageFiles || [];
  const videoFiles = req.productVideoFiles || [];
  if (!imageFiles.length && !videoFiles.length) return;

  const offset = datosProducto.media?.length || 0;
  const nuevos = buildMediaFromUploads(imageFiles, videoFiles, datosProducto.nombre, offset);
  datosProducto.media = [...(datosProducto.media || []), ...nuevos];
}

// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Public
const obtenerProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const categoria = req.query.categoria;
    const busqueda = req.query.q || req.query.busqueda; // Frontend envía 'q'
    const minPrecio = req.query.precioMin || req.query.minPrecio;
    const maxPrecio = req.query.precioMax || req.query.maxPrecio;
    const ordenar = req.query.ordenar || 'fechaCreacion';

    // Construir filtros
    let filtros = { estado: { $in: PUBLIC_PRODUCT_STATUSES } };

    if (categoria) {
      filtros.categoria = categoria;
    }

    if (busqueda) {
      filtros.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { descripcion: { $regex: busqueda, $options: 'i' } }
      ];
    }

    if (minPrecio || maxPrecio) {
      filtros.precio = {};
      if (minPrecio) filtros.precio.$gte = parseFloat(minPrecio);
      if (maxPrecio) filtros.precio.$lte = parseFloat(maxPrecio);
    }

    // Opciones de ordenamiento
    let sortOptions = {};
    switch (ordenar) {
      case 'precio_asc':
      case 'precio-asc':
        sortOptions = { precio: 1 };
        break;
      case 'precio_desc':
      case 'precio-desc':
        sortOptions = { precio: -1 };
        break;
      case 'nombre':
        sortOptions = { nombre: 1 };
        break;
      case 'calificacion':
        sortOptions = { 'estadisticas.calificacionPromedio': -1 };
        break;
      case 'fecha_asc':
      case 'fecha-asc':
        sortOptions = { fechaCreacion: 1 };
        break;
      case 'fechaCreacion':
      case 'fecha-desc':
        sortOptions = { fechaCreacion: -1 };
        break;
      case 'popular':
        sortOptions = { 'estadisticas.cantidadVendida': -1 };
        break;
      default:
        sortOptions = { fechaCreacion: -1 };
    }

    const productos = await Product.find(filtros)
      .populate('comerciante', 'nombre nombreEmpresa descripcionEmpresa categoriaEmpresa sitioWeb verificado')
      .populate('categoria', 'nombre slug')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Product.countDocuments(filtros);
    const paginacion = paginateData(total, page, limit);

    // Transformar URLs de imágenes
    const productosTransformados = transformarProductos(productos);

    successResponse(res, 'Productos obtenidos exitosamente', {
      datos: productosTransformados, // Frontend espera 'datos' no 'productos'
      paginacion
    });

  } catch (error) {
    logger.error('products_list_failed', { message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener producto por ID con información completa
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('product_invalid_id', { id });
      return errorResponse(res, 'ID de producto inválido', 400);
    }

    const product = await Product.findById(id)
      .populate('categoria', 'nombre descripcion')
      .populate('comerciante', 'nombre nombreEmpresa descripcionEmpresa categoriaEmpresa sitioWeb verificado')
      .lean();

    if (!product) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    if (!PUBLIC_PRODUCT_STATUSES.includes(product.estado)) {
      return errorResponse(res, 'Producto no disponible', 404);
    }

    // Obtener reseñas del producto
    const reviews = await Review.find({ producto: id })
      .populate('usuario', 'nombre')
      .sort({ fechaCreacion: -1 })
      .limit(10)
      .lean();

    // Calcular estadísticas de reseñas
    const reviewStats = await Review.aggregate([
      { $match: { producto: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalReseñas: { $sum: 1 },
          promedioCalificacion: { $avg: '$calificacion' },
          distribucion: { $push: '$calificacion' }
        }
      }
    ]);

    let distribucionCalificaciones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (reviewStats[0] && reviewStats[0].distribucion) {
      reviewStats[0].distribucion.forEach(cal => {
        distribucionCalificaciones[cal]++;
      });
    }

    // Obtener productos relacionados (misma categoría) - con manejo seguro de categoria
    let productosRelacionados = [];
    if (product.categoria && (product.categoria._id || product.categoria)) {
      const categoriaId = product.categoria._id || product.categoria;
      try {
        productosRelacionados = await Product.find({
          categoria: categoriaId,
          _id: { $ne: id },
          estado: { $in: PUBLIC_PRODUCT_STATUSES },
          stock: { $gt: 0 }
        })
          .populate('categoria', 'nombre')
          .populate('comerciante', 'nombre')
          .limit(6)
          .lean();
      } catch (relatedError) {
        logger.warn('product_related_failed', { productId: id, message: relatedError.message });
        // Continuar sin productos relacionados
      }
    }

    // Transformar URLs de imágenes
    const productoTransformado = transformarProducto(product);
    const productosRelacionadosTransformados = transformarProductos(productosRelacionados);

    const productData = {
      ...productoTransformado,
      reseñas: reviews,
      estadisticasReseñas: {
        totalReseñas: reviewStats[0]?.totalReseñas || 0,
        promedioCalificacion: reviewStats[0]?.promedioCalificacion || 0,
        distribucionCalificaciones
      },
      productosRelacionados: productosRelacionadosTransformados
    };

    successResponse(res, 'Producto obtenido exitosamente', productData);

  } catch (error) {
    logger.error('product_detail_failed', { productId: id, message: error.message });
    
    // Si es un error de cast (ID inválido que pasó la validación inicial)
    if (error.name === 'CastError') {
      return errorResponse(res, 'ID de producto inválido', 400);
    }
    
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Crear nuevo producto
// @route   POST /api/products
// @access  Private (Comerciante)
const crearProducto = async (req, res) => {
  const uploaded = [...(req.productImageFiles || []), ...(req.productVideoFiles || [])];
  try {
    logger.debug('product_create_start', {
      requestId: req.requestId,
      merchantId: req.usuario.id,
      images: req.productImageFiles?.length || 0,
      videos: req.productVideoFiles?.length || 0,
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, 'VALIDATION_ERROR', 'Errores de validación', errors.array());
    }

    const nombre = String(req.body.nombre || '').trim();
    const descripcion = String(req.body.descripcion || '').trim();
    const precio = coerceNumber(req.body.precio, 0);
    const categoria = req.body.categoria;

    if (!nombre) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, 'MISSING_NAME', 'El nombre del producto es requerido');
    }
    if (!descripcion) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, 'MISSING_DESCRIPTION', 'La descripción es requerida');
    }
    if (precio <= 0) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, 'INVALID_PRICE', 'El precio debe ser mayor a 0');
    }
    if (!categoria) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, 'MISSING_CATEGORY', 'La categoría es requerida');
    }

    const datosProducto = {
      nombre,
      descripcion,
      precio,
      stock: coerceNumber(req.body.stock, 0),
      categoria,
      comerciante: req.usuario.id,
      estado: 'pending',
      moderacion: { estado: 'pending' },
      media: [],
    };

    if (req.body.tags) {
      try {
        datosProducto.tags = parseJsonField(req.body.tags, req.body.tags);
      } catch {
        datosProducto.tags = String(req.body.tags).split(',').map((tag) => tag.trim());
      }
    }

    const { variants, error: variantError } = normalizeVariantsInput(
      req.body.variants,
      datosProducto.nombre,
      datosProducto.precio,
    );
    if (variantError) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, variantError.code, variantError.message);
    }
    if (variants.length > 0) {
      datosProducto.variants = variants;
    }

    const stockError = validateStockPolicy({ stock: datosProducto.stock, variants });
    if (stockError) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, stockError.code, stockError.message);
    }

    if (req.body.especificaciones) {
      try {
        const specs =
          typeof req.body.especificaciones === 'string'
            ? JSON.parse(req.body.especificaciones)
            : req.body.especificaciones;
        datosProducto.especificaciones = Object.entries(specs)
          .filter(([, value]) => value && String(value).trim() !== '')
          .map(([nombre, valor]) => ({ nombre, valor: String(valor) }));
      } catch (e) {
        logger.warn('product_specs_parse_failed', { requestId: req.requestId, message: e.message });
      }
    }

    applyUploadedMedia(datosProducto, req);
    syncLegacyImagesFromMedia(datosProducto);

    const producto = new Product(datosProducto);
    await producto.save();
    await producto.populate('comerciante', 'nombre email');

    logger.info('product_created_pending_moderation', {
      requestId: req.requestId,
      productId: producto._id,
      merchantId: req.usuario.id,
      mediaCount: producto.media?.length || 0,
      variantCount: producto.variants?.length || 0,
      stock: producto.stock,
    });

    successResponse(
      res,
      'Producto creado exitosamente. Quedó pendiente de revisión antes de publicarse.',
      transformarProducto(producto.toObject({ virtuals: true })),
      201,
    );
  } catch (error) {
    cleanupUploadedFiles(uploaded);
    logger.error('product_create_failed', { requestId: req.requestId, message: error.message });
    if (error.name === 'ValidationError') {
      return structuredError(res, 400, 'MONGOOSE_VALIDATION', 'Error de validación', error.errors);
    }
    if (error.message?.includes('variante')) {
      return structuredError(res, 400, 'VARIANT_CONFLICT', error.message);
    }
    return structuredError(res, 500, 'PRODUCT_CREATE_FAILED', 'Error interno del servidor');
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private (Comerciante - Solo sus productos)
const actualizarProducto = async (req, res) => {
  const uploaded = [...(req.productImageFiles || []), ...(req.productVideoFiles || [])];
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, 'INVALID_PRODUCT_ID', 'ID de producto inválido');
    }

    const producto = await Product.findById(req.params.id);
    if (!producto) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado');
    }
    if (producto.comerciante.toString() !== req.usuario.id) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 403, 'FORBIDDEN', 'No tienes permiso para actualizar este producto');
    }

    ensureMediaFromLegacy(producto);
    const b = req.body || {};

    if (b.nombre != null && String(b.nombre).trim() !== '') producto.nombre = String(b.nombre).trim();
    if (b.descripcion != null && String(b.descripcion).trim() !== '') producto.descripcion = String(b.descripcion).trim();
    if (b.precio != null && String(b.precio).trim() !== '') producto.precio = coerceNumber(b.precio, producto.precio);
    if (b.stock != null && String(b.stock).trim() !== '' && (!producto.variants?.length)) {
      producto.stock = coerceNumber(b.stock, producto.stock);
    }
    if (b.categoria != null && String(b.categoria).trim() !== '') producto.categoria = b.categoria;

    if (b.tags) {
      try {
        producto.tags = parseJsonField(b.tags, b.tags);
      } catch {
        producto.tags = String(b.tags).split(',').map((tag) => tag.trim()).filter(Boolean);
      }
    }

    if (b.variants != null) {
      const { variants, error: variantError } = normalizeVariantsInput(b.variants, producto.nombre, producto.precio);
      if (variantError) {
        cleanupUploadedFiles(uploaded);
        return structuredError(res, 400, variantError.code, variantError.message);
      }
      producto.variants = variants;
      producto.markModified('variants');
    }

    const stockError = validateStockPolicy({
      stock: producto.stock,
      variants: producto.variants,
    });
    if (stockError) {
      cleanupUploadedFiles(uploaded);
      return structuredError(res, 400, stockError.code, stockError.message);
    }

    if (b.especificaciones) {
      try {
        const specs = typeof b.especificaciones === 'string' ? JSON.parse(b.especificaciones) : b.especificaciones;
        producto.especificaciones = Object.entries(specs)
          .filter(([, value]) => value && String(value).trim() !== '')
          .map(([nombre, valor]) => ({ nombre, valor: String(valor) }));
      } catch (e) {
        logger.warn('product_update_specs_parse_failed', { requestId: req.requestId, message: e.message });
      }
    }

    const removedIds = parseRemovedMediaIds(b.removedMediaIds);
    if (removedIds.length) {
      removeMediaByIds(producto, removedIds);
      producto.markModified('media');
    }

    const mediaOrder = parseMediaOrderField(b.mediaOrder);
    if (mediaOrder) {
      reorderMedia(producto, mediaOrder);
      producto.markModified('media');
    }

    if (uploaded.length) {
      const offset = producto.media?.length || 0;
      const nuevos = buildMediaFromUploads(req.productImageFiles, req.productVideoFiles, producto.nombre, offset);
      producto.media = [...(producto.media || []), ...nuevos];
      producto.markModified('media');
    }

    syncLegacyImagesFromMedia(producto);
    producto.markModified('imagenes');

    producto.estado = 'pending';
    producto.moderacion = {
      estado: 'pending',
      razonRechazo: undefined,
      moderadoPor: undefined,
      fechaModeracion: undefined,
    };

    await producto.save();
    await producto.populate('comerciante', 'nombre email');

    successResponse(res, 'Producto actualizado exitosamente', transformarProducto(producto.toObject({ virtuals: true })));
  } catch (error) {
    cleanupUploadedFiles(uploaded);
    logger.error('product_update_failed', { requestId: req.requestId, message: error.message });
    if (error.name === 'ValidationError') {
      return structuredError(res, 400, 'MONGOOSE_VALIDATION', 'Error de validación', error.errors);
    }
    if (error.message?.includes('variante')) {
      return structuredError(res, 400, 'VARIANT_CONFLICT', error.message);
    }
    return structuredError(res, 500, 'PRODUCT_UPDATE_FAILED', 'Error interno del servidor');
  }
};

// @desc    Eliminar producto
// @route   DELETE /api/products/:id
// @access  Private (Comerciante - Solo sus productos)
const eliminarProducto = async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'ID de producto inválido', 400);
    }

    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    // Verificar que el comerciante sea el dueño del producto
    if (producto.comerciante.toString() !== req.usuario.id) {
      return errorResponse(res, 'No tienes permiso para eliminar este producto', 403);
    }

    await Product.findByIdAndDelete(req.params.id);

    successResponse(res, 'Producto eliminado exitosamente');

  } catch (error) {
    logger.error('product_delete_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener productos del comerciante actual
// @route   GET /api/products/mis-productos
// @access  Private (Comerciante)
const obtenerMisProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const estado = req.query.estado;

    let filtros = { comerciante: req.usuario.id };

    if (estado && MERCHANT_VISIBLE_STATUSES.includes(estado)) {
      filtros.estado = estado;
    }

    const productos = await Product.find(filtros)
      .populate('comerciante', 'nombre email')
      .populate('categoria', 'nombre slug')
      .sort({ fechaCreacion: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Product.countDocuments(filtros);
    const paginacion = paginateData(total, page, limit);

    // Transformar URLs de imágenes
    const productosTransformados = transformarProductos(productos);

    successResponse(res, 'Productos obtenidos exitosamente', {
      datos: productosTransformados, // Frontend espera 'datos'
      paginacion
    });

  } catch (error) {
    logger.error('merchant_products_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Subir imágenes del producto
// @route   POST /api/products/:id/imagenes
// @access  Private (Comerciante - Solo sus productos)
const subirImagenes = async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'ID de producto inválido', 400);
    }

    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    // Verificar que el comerciante sea el dueño del producto
    if (producto.comerciante.toString() !== req.usuario.id) {
      return errorResponse(res, 'No tienes permiso para subir imágenes a este producto', 403);
    }

    const imageFiles = req.productImageFiles || [];
    const videoFiles = req.productVideoFiles || [];
    if (!imageFiles.length && !videoFiles.length) {
      return structuredError(res, 400, 'NO_MEDIA_UPLOADED', 'No se han subido archivos de medios');
    }

    ensureMediaFromLegacy(producto);
    const offset = producto.media?.length || 0;
    const nuevos = buildMediaFromUploads(imageFiles, videoFiles, producto.nombre, offset);
    producto.media = [...(producto.media || []), ...nuevos];
    producto.markModified('media');
    syncLegacyImagesFromMedia(producto);
    producto.markModified('imagenes');
    await producto.save();

    const doc = transformarProducto(producto.toObject({ virtuals: true }));
    successResponse(res, 'Medios subidos exitosamente', {
      media: doc?.media || [],
      imagenes: doc?.imagenes || [],
      imagenPrincipal: doc?.imagenPrincipal,
    });

  } catch (error) {
    logger.error('product_images_upload_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

module.exports = {
  obtenerProductos,
  getProductById, // Changed from obtenerProductoPorId
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerMisProductos,
  subirImagenes
}; 