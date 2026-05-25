const Category = require('../models/Category');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { successResponse, errorResponse, paginateData, validarObjectId } = require('../utils/helpers');
const { enviarNotificacion } = require('../services/notificationService');
const { ensureActiveCategories } = require('../services/categorySeedService');

const ACTIVE_CATEGORY_STATUSES = ['activa', 'activo', 'approved', 'aprobado'];

const CATEGORY_PUBLIC_FIELDS = 'nombre descripcion slug icono color orden estado padre mostrarEnMenu destacada';

const serializeCategory = (category) => ({
  ...category,
  _id: String(category._id),
  padre: category.padre ? String(category.padre) : null
});

// @desc    Obtener todas las categorías aprobadas
// @route   GET /api/categories
// @access  Public
const obtenerCategorias = async (req, res) => {
  try {
    const incluirInactivas = req.query.incluirInactivas === 'true';
    const soloRaices = req.query.soloRaices === 'true';
    const conContadores = req.query.conContadores === 'true';

    // Construir filtros
    let filtros = { estado: { $in: ACTIVE_CATEGORY_STATUSES } };
    
    if (incluirInactivas && req.usuario && req.usuario.rol === 'administrador') {
      filtros = {}; // Mostrar todas si es admin
    }

    if (soloRaices) {
      filtros.padre = null; // Solo categorías raíz
    }

    // Obtener categorías - versión simplificada
    const categorias = await Category.find(filtros)
      .select('nombre slug icono color orden estado')
      .sort({ orden: 1, nombre: 1 })
      .lean();

    // Agregar contadores de productos si se solicita
    if (conContadores) {
      for (let categoria of categorias) {
        const conteoProductos = await Product.countDocuments({
          categoria: categoria._id,
          estado: 'aprobado'
        });
        categoria.totalProductos = conteoProductos;
      }
    }

    successResponse(res, 'Categorías obtenidas exitosamente', categorias);

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener categorías activas para formularios y navegación
// @route   GET /api/categories/active
// @access  Public
const obtenerCategoriasActivas = async (req, res) => {
  try {
    let categorias = await Category.find({ estado: 'activa' })
      .select(CATEGORY_PUBLIC_FIELDS)
      .sort({ orden: 1, nombre: 1 })
      .lean();

    if (categorias.length === 0) {
      await ensureActiveCategories({ reason: 'active_categories_endpoint_empty' });
      categorias = await Category.find({ estado: 'activa' })
        .select(CATEGORY_PUBLIC_FIELDS)
        .sort({ orden: 1, nombre: 1 })
        .lean();
    }

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      categories: categorias.map(serializeCategory)
    });
  } catch (error) {
    console.error('Error obteniendo categorías activas:', error);
    return errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener categoría por ID o slug
// @route   GET /api/categories/:id
// @access  Public
const obtenerCategoriaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar por ID o slug
    let categoria;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      categoria = await Category.findById(id);
    } else {
      categoria = await Category.findOne({ slug: id });
    }

    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    // Solo mostrar categorías activas a usuarios no admin
    if (categoria.estado !== 'activa' && 
        (!req.usuario || req.usuario.rol !== 'administrador')) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    await categoria.populate([
      { path: 'padre', select: 'nombre slug' },
      { path: 'subcategorias', select: 'nombre slug icono estado' }
    ]);

    // Contar productos de esta categoría
    const totalProductos = await Product.countDocuments({
      categoria: categoria._id,
      estado: 'aprobado'
    });

    // Obtener productos populares de la categoría
    const productosPopulares = await Product.find({
      categoria: categoria._id,
      estado: 'aprobado'
    })
      .select('nombre precio imagenes estadisticas')
      .sort({ 'estadisticas.vistas': -1 })
      .limit(5)
      .lean();

    successResponse(res, 'Categoría obtenida exitosamente', {
      ...categoria.toObject(),
      totalProductos,
      productosPopulares
    });

  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    if (error.name === 'CastError') {
      return errorResponse(res, 'ID de categoría inválido', 400);
    }
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Crear nueva categoría
// @route   POST /api/categories
// @access  Private (Comerciante/Admin)
const crearCategoria = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Errores de validación', 400, errors.array());
    }

    const { nombre, descripcion, padre, icono, metadatos } = req.body;

    // Verificar que la categoría padre existe (si se especifica)
    if (padre) {
      const categoriaPadre = await Category.findById(padre);
      if (!categoriaPadre) {
        return errorResponse(res, 'Categoría padre no encontrada', 404);
      }
      
      // Verificar que no se esté creando más de 3 niveles de profundidad
      if (categoriaPadre.nivel >= 2) {
        return errorResponse(res, 'No se pueden crear más de 3 niveles de categorías', 400);
      }
    }

    // Verificar que no exista una categoría con el mismo nombre en el mismo nivel
    const categoriaExistente = await Category.findOne({
      nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
      padre: padre || null
    });

    if (categoriaExistente) {
      return errorResponse(res, 'Ya existe una categoría con este nombre en este nivel', 400);
    }

    // Determinar el estado inicial
    const estadoInicial = req.usuario.rol === 'administrador' ? 'activa' : 'pendiente';
    
    // Calcular nivel y posición
    const nivel = padre ? 
      (await Category.findById(padre)).nivel + 1 : 0;
    
    const orden = await Category.countDocuments({ padre: padre || null }) + 1;

    // Crear categoría
    const categoria = new Category({
      nombre,
      descripcion,
      padre,
      icono,
      metadatos,
      estado: estadoInicial,
      nivel,
      orden,
      creadaPor: req.usuario.id
    });

    await categoria.save();

    // Si tiene padre, agregar a sus subcategorías
    if (padre) {
      await Category.findByIdAndUpdate(padre, {
        $push: { subcategorias: categoria._id }
      });
    }

    // Notificar admin si no es admin quien crea
    if (req.usuario.rol !== 'administrador') {
      try {
        // Buscar administradores
        const User = require('../models/User');
        const admins = await User.find({ rol: 'administrador' }).select('_id');
        
        for (let admin of admins) {
          await enviarNotificacion(admin._id, 'nueva_categoria', {
            categoriaNombre: nombre,
            comerciante: req.usuario.nombre,
            categoriaId: categoria._id
          });
        }
      } catch (notifError) {
        console.error('Error enviando notificaciones:', notifError);
      }
    }

    await categoria.populate('padre', 'nombre slug');

    successResponse(res, 'Categoría creada exitosamente', categoria, 201);

  } catch (error) {
    console.error('Error creando categoría:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Error de validación', 400, error.errors);
    }
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Actualizar categoría
// @route   PUT /api/categories/:id
// @access  Private (Admin o creador)
const actualizarCategoria = async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(req.params.id)) {
      return errorResponse(res, 'ID de categoría inválido', 400);
    }

    const categoria = await Category.findById(req.params.id);

    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    // Verificar permisos
    const esAdmin = req.usuario.rol === 'administrador';
    const esCreador = categoria.creadaPor && categoria.creadaPor.toString() === req.usuario.id;

    if (!esAdmin && !esCreador) {
      return errorResponse(res, 'No tienes permiso para actualizar esta categoría', 403);
    }

    // Si no es admin y la categoría fue modificada, cambiar estado a pendiente
    if (!esAdmin && categoria.estado === 'activa') {
      req.body.estado = 'pendiente';
    }

    const categoriaActualizada = await Category.findByIdAndUpdate(
      req.params.id,
      { ...req.body, fechaActualizacion: new Date() },
      { new: true, runValidators: true }
    ).populate('padre', 'nombre slug');

    successResponse(res, 'Categoría actualizada exitosamente', categoriaActualizada);

  } catch (error) {
    console.error('Error actualizando categoría:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Error de validación', 400, error.errors);
    }
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Eliminar categoría
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const eliminarCategoria = async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(req.params.id)) {
      return errorResponse(res, 'ID de categoría inválido', 400);
    }

    const categoria = await Category.findById(req.params.id);

    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    // Verificar que no tenga subcategorías
    if (categoria.subcategorias && categoria.subcategorias.length > 0) {
      return errorResponse(res, 'No se puede eliminar una categoría con subcategorías', 400);
    }

    // Verificar que no tenga productos
    const productosCount = await Product.countDocuments({ categoria: categoria._id });
    if (productosCount > 0) {
      return errorResponse(res, 'No se puede eliminar una categoría con productos', 400);
    }

    // Remover de categoría padre si existe
    if (categoria.padre) {
      await Category.findByIdAndUpdate(categoria.padre, {
        $pull: { subcategorias: categoria._id }
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    successResponse(res, 'Categoría eliminada exitosamente');

  } catch (error) {
    console.error('Error eliminando categoría:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener categorías pendientes de aprobación
// @route   GET /api/categories/pending
// @access  Private (Admin)
const obtenerCategoriasPendientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const categorias = await Category.find({ estado: 'pendiente' })
      .populate('creadaPor', 'nombre email rol')
      .populate('padre', 'nombre')
      .sort({ fechaCreacion: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Category.countDocuments({ estado: 'pendiente' });
    const paginacion = paginateData(total, page, limit);

    successResponse(res, 'Categorías pendientes obtenidas exitosamente', {
      categorias,
      paginacion
    });

  } catch (error) {
    console.error('Error obteniendo categorías pendientes:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Aprobar/rechazar categoría
// @route   PUT /api/categories/:id/approve
// @access  Private (Admin)
const aprobarCategoria = async (req, res) => {
  try {
    const { estado, comentario } = req.body;

    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(req.params.id)) {
      return errorResponse(res, 'ID de categoría inválido', 400);
    }

    if (!['activa', 'rechazada'].includes(estado)) {
      return errorResponse(res, 'Estado inválido. Debe ser "activa" o "rechazada"', 400);
    }

    if (estado === 'rechazada' && !comentario) {
      return errorResponse(res, 'El comentario es requerido para rechazar', 400);
    }

    const categoria = await Category.findById(req.params.id)
      .populate('creadaPor', 'nombre email');

    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    categoria.estado = estado;
    categoria.fechaAprobacion = new Date();
    categoria.aprobadoPor = req.usuario.id;
    
    if (estado === 'rechazada') {
      categoria.comentarioRechazo = comentario;
    }

    await categoria.save();

    // Notificar al creador
    if (categoria.creadaPor) {
      try {
        await enviarNotificacion(categoria.creadaPor._id, 'categoria_moderada', {
          categoriaNombre: categoria.nombre,
          estado,
          comentario: estado === 'rechazada' ? comentario : null
        });
      } catch (notifError) {
        console.error('Error enviando notificación:', notifError);
      }
    }

    successResponse(res, `Categoría ${estado} exitosamente`, categoria);

  } catch (error) {
    console.error('Error aprobando categoría:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener árbol jerárquico de categorías
// @route   GET /api/categories/tree
// @access  Public
const obtenerArbolCategorias = async (req, res) => {
  try {
    // Obtener todas las categorías activas
    const categorias = await Category.find({ estado: 'activa' })
      .sort({ orden: 1, nombre: 1 })
      .lean();

    // Construir árbol jerárquico
    const arbol = construirArbolCategorias(categorias);

    successResponse(res, 'Árbol de categorías obtenido exitosamente', arbol);

  } catch (error) {
    console.error('Error obteniendo árbol de categorías:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Reordenar categorías
// @route   PUT /api/categories/reorder
// @access  Private (Admin)
const reordenarCategorias = async (req, res) => {
  try {
    const { categorias } = req.body; // Array de { id, orden }

    if (!Array.isArray(categorias)) {
      return errorResponse(res, 'Se requiere un array de categorías', 400);
    }

    // Actualizar orden de cada categoría
    const promesas = categorias.map(({ id, orden }) => 
      Category.findByIdAndUpdate(id, { orden })
    );

    await Promise.all(promesas);

    successResponse(res, 'Orden de categorías actualizado exitosamente');

  } catch (error) {
    console.error('Error reordenando categorías:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// Función auxiliar para construir árbol jerárquico
const construirArbolCategorias = (categorias) => {
  const mapa = {};
  const raices = [];

  // Crear mapa de categorías
  categorias.forEach(categoria => {
    mapa[categoria._id] = { ...categoria, subcategorias: [] };
  });

  // Construir relaciones padre-hijo
  categorias.forEach(categoria => {
    if (categoria.padre) {
      if (mapa[categoria.padre]) {
        mapa[categoria.padre].subcategorias.push(mapa[categoria._id]);
      }
    } else {
      raices.push(mapa[categoria._id]);
    }
  });

  return raices;
};

module.exports = {
  obtenerCategorias,
  obtenerCategoriasActivas,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  obtenerCategoriasPendientes,
  aprobarCategoria,
  obtenerArbolCategorias,
  reordenarCategorias
}; 