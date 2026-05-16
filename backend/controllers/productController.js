const Product = require('../models/Product');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { successResponse, errorResponse, paginateData, transformarProducto, transformarProductos } = require('../utils/helpers');
const Review = require('../models/Review'); // Added Review model
const Order = require('../models/Order'); // Added Order model
const mongoose = require('mongoose');

/**
 * Construye documentos `imagenes` desde req.files (disco local o Cloudinary).
 * Se guarda `/uploads/...` o URL absoluta; el frontend antepone REACT_APP_API_URL a las rutas relativas.
 */
function mapUploadedFilesToImagenes(files, nombreBase) {
  if (!files || !files.length) return [];
  const baseName = nombreBase || 'Producto';
  const out = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let imageUrl;
    const p = file.path != null ? String(file.path) : '';
    if (p.startsWith('http://') || p.startsWith('https://')) {
      imageUrl = p;
    } else if (p) {
      const norm = p.replace(/\\/g, '/');
      const lower = norm.toLowerCase();
      const idx = lower.indexOf('/uploads/');
      if (idx !== -1) {
        imageUrl = norm.slice(idx);
      } else {
        const up = lower.indexOf('uploads/');
        if (up !== -1) {
          imageUrl = `/${norm.slice(up)}`;
        } else {
          imageUrl = `/uploads/productos/${file.filename || `file-${Date.now()}`}`;
        }
      }
    } else if (file.filename) {
      imageUrl = `/uploads/productos/${file.filename}`;
    } else {
      continue;
    }
    out.push({
      url: String(imageUrl).replace(/\\/g, '/'),
      publicId: file.public_id || null,
      alt: `${baseName} - Imagen ${i + 1}`,
      orden: i,
    });
  }
  return out;
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
    let filtros = { estado: 'aprobado' };

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
      .populate('comerciante', 'nombre email estadisticasComerciante')
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
    console.error('Error obteniendo productos:', error);
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
      console.error('❌ ID de producto inválido:', id);
      return errorResponse(res, 'ID de producto inválido', 400);
    }

    const product = await Product.findById(id)
      .populate('categoria', 'nombre descripcion')
      .populate('comerciante', 'nombre email telefono direccion')
      .lean();

    if (!product) {
      return errorResponse(res, 'Producto no encontrado', 404);
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
          estado: 'aprobado',
          stock: { $gt: 0 }
        })
          .populate('categoria', 'nombre')
          .populate('comerciante', 'nombre')
          .limit(6)
          .lean();
      } catch (relatedError) {
        console.warn('⚠️  Error obteniendo productos relacionados:', relatedError.message);
        // Continuar sin productos relacionados
      }
    }

    // Obtener estadísticas de ventas del producto
    let ventasStats = [];
    try {
      ventasStats = await Order.aggregate([
        { $match: { 'productos.producto': new mongoose.Types.ObjectId(id), estado: 'entregado' } },
        { $unwind: '$productos' },
        { $match: { 'productos.producto': new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: null,
            totalVendido: { $sum: '$productos.cantidad' },
            totalIngresos: { $sum: { $multiply: ['$productos.precio', '$productos.cantidad'] } }
          }
        }
      ]);
    } catch (ventasError) {
      console.warn('⚠️  Error obteniendo estadísticas de ventas:', ventasError.message);
      // Continuar sin estadísticas de ventas
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
      productosRelacionados: productosRelacionadosTransformados,
      estadisticasVentas: {
        totalVendido: ventasStats[0]?.totalVendido || 0,
        totalIngresos: ventasStats[0]?.totalIngresos || 0
      }
    };

    successResponse(res, 'Producto obtenido exitosamente', productData);

  } catch (error) {
    console.error('❌ Error obteniendo producto:', error);
    console.error('Stack trace:', error.stack);
    
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
  try {
    console.log('📝 Creando producto:', req.body);
    console.log('📁 Archivos recibidos:', req.files ? req.files.length : 0);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Errores de validación', 400, errors.array());
    }

    // Procesar los datos del producto
    const datosProducto = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      precio: parseFloat(req.body.precio),
      stock: parseInt(req.body.stock) || 0,
      categoria: req.body.categoria,
      comerciante: req.usuario.id,
      estado: 'aprobado' // Los productos se aprueban automáticamente
    };

    // Procesar tags si existen
    if (req.body.tags) {
      try {
        datosProducto.tags = typeof req.body.tags === 'string' 
          ? JSON.parse(req.body.tags) 
          : req.body.tags;
      } catch (e) {
        datosProducto.tags = req.body.tags.split(',').map(tag => tag.trim());
      }
    }

    // Procesar especificaciones si existen
    if (req.body.especificaciones) {
      try {
        const specs = typeof req.body.especificaciones === 'string'
          ? JSON.parse(req.body.especificaciones)
          : req.body.especificaciones;
        
        // Convertir objeto plano a array de objetos {nombre, valor}
        datosProducto.especificaciones = Object.entries(specs)
          .filter(([key, value]) => value && value.trim() !== '')
          .map(([nombre, valor]) => ({ nombre, valor }));
      } catch (e) {
        console.log('⚠️  Error procesando especificaciones:', e);
      }
    }

    // Procesar imágenes
    if (req.files && req.files.length > 0) {
      const imagenesData = mapUploadedFilesToImagenes(req.files, datosProducto.nombre);
      if (imagenesData.length > 0) {
        datosProducto.imagenes = imagenesData;
        datosProducto.imagenPrincipal = imagenesData[0].url;
      }
    } else {
      console.log('📷 No se subieron imágenes para este producto');
    }

    console.log('💾 Datos finales del producto:', datosProducto);

    const producto = new Product(datosProducto);
    await producto.save();

    await producto.populate('comerciante', 'nombre email');

    console.log('✅ Producto creado exitosamente:', producto._id);

    successResponse(res, 'Producto creado exitosamente y ya está disponible en el mercado.', transformarProducto(producto.toObject({ virtuals: true })), 201);

  } catch (error) {
    console.error('❌ Error creando producto:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Error de validación', 400, error.errors);
    }
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private (Comerciante - Solo sus productos)
const actualizarProducto = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'ID de producto inválido', 400);
    }

    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    if (producto.comerciante.toString() !== req.usuario.id) {
      return errorResponse(res, 'No tienes permiso para actualizar este producto', 403);
    }

    const b = req.body || {};

    if (b.nombre != null && String(b.nombre).trim() !== '') {
      producto.nombre = String(b.nombre).trim();
    }
    if (b.descripcion != null && String(b.descripcion).trim() !== '') {
      producto.descripcion = String(b.descripcion).trim();
    }
    if (b.precio != null && String(b.precio).trim() !== '') {
      producto.precio = parseFloat(b.precio);
    }
    if (b.stock != null && String(b.stock).trim() !== '') {
      producto.stock = parseInt(b.stock, 10);
    }
    if (b.categoria != null && String(b.categoria).trim() !== '') {
      producto.categoria = b.categoria;
    }

    if (b.tags) {
      try {
        producto.tags =
          typeof b.tags === 'string' ? JSON.parse(b.tags) : b.tags;
      } catch {
        producto.tags = String(b.tags)
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    if (b.especificaciones) {
      try {
        const specs =
          typeof b.especificaciones === 'string'
            ? JSON.parse(b.especificaciones)
            : b.especificaciones;
        producto.especificaciones = Object.entries(specs)
          .filter(([, value]) => value && String(value).trim() !== '')
          .map(([nombre, valor]) => ({ nombre, valor: String(valor) }));
      } catch (e) {
        console.warn('⚠️  Error procesando especificaciones en actualización:', e.message);
      }
    }

    if (req.files && req.files.length > 0) {
      const nuevas = mapUploadedFilesToImagenes(req.files, producto.nombre);
      const offset = producto.imagenes?.length || 0;
      nuevas.forEach((img, idx) => {
        img.orden = offset + idx;
      });
      producto.imagenes = [...(producto.imagenes || []), ...nuevas];
      if (!producto.imagenPrincipal && nuevas.length > 0) {
        producto.imagenPrincipal = nuevas[0].url;
      }
      producto.markModified('imagenes');
    }

    await producto.save();
    await producto.populate('comerciante', 'nombre email');

    successResponse(
      res,
      'Producto actualizado exitosamente',
      transformarProducto(producto.toObject({ virtuals: true })),
    );
  } catch (error) {
    console.error('Error actualizando producto:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Error de validación', 400, error.errors);
    }
    errorResponse(res, 'Error interno del servidor', 500);
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
    console.error('Error eliminando producto:', error);
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

    if (estado) {
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

    console.log('📦 Mis productos encontrados:', productos.length, 'de', total);

    // Transformar URLs de imágenes
    const productosTransformados = transformarProductos(productos);

    successResponse(res, 'Productos obtenidos exitosamente', {
      datos: productosTransformados, // Frontend espera 'datos'
      paginacion
    });

  } catch (error) {
    console.error('Error obteniendo mis productos:', error);
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

    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No se han subido imágenes', 400);
    }

    const nuevas = mapUploadedFilesToImagenes(req.files, producto.nombre);
    const offset = producto.imagenes?.length || 0;
    nuevas.forEach((img, idx) => {
      img.orden = offset + idx;
    });
    producto.imagenes = [...(producto.imagenes || []), ...nuevas];
    if (!producto.imagenPrincipal && nuevas.length > 0) {
      producto.imagenPrincipal = nuevas[0].url;
    }
    producto.markModified('imagenes');
    await producto.save();

    const doc = transformarProducto(producto.toObject({ virtuals: true }));
    successResponse(res, 'Imágenes subidas exitosamente', {
      imagenes: doc?.imagenes || [],
      imagenPrincipal: doc?.imagenPrincipal,
    });

  } catch (error) {
    console.error('Error subiendo imágenes:', error);
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