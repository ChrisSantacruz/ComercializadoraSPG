const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req);
  
  if (!errores.isEmpty()) {
    const arr = errores.array();
    const first = arr[0];
    return res.status(400).json({
      exito: false,
      mensaje: first?.msg || 'Datos inválidos',
      codigo: 'VALIDATION_ERROR',
      accion: 'Revisa los datos e inténtalo de nuevo',
      errores: arr.map((error) => ({
        campo: error.path,
        mensaje: error.msg,
        valor: error.value,
      })),
      requestId: req.requestId,
    });
  }
  
  next();
};

// Validaciones para usuario
const validarRegistroUsuario = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
    
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .customSanitizer(value => {
      // Solo hacer lowercase pero mantener el formato original (con puntos)
      return value ? value.toLowerCase().trim() : value;
    }),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
    
  body('telefono')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Número de teléfono inválido'),
    
  body('rol')
    .optional()
    .isIn(['cliente', 'comerciante', 'user', 'merchant'])
    .withMessage('Rol inválido. Solo se permite user/cliente o merchant/comerciante'),
    
  body('nombreEmpresa')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre de la empresa debe tener entre 2 y 100 caracteres'),
    
  manejarErroresValidacion
];

const validarLoginUsuario = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .customSanitizer(value => {
      // Solo hacer lowercase pero mantener el formato original (con puntos)
      return value ? value.toLowerCase().trim() : value;
    }),
    
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
    
  manejarErroresValidacion
];

// Validaciones para producto
const validarProducto = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre del producto es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    
  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10, max: 2000 })
    .withMessage('La descripción debe tener entre 10 y 2000 caracteres'),
    
  body('precio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
    
  body('precioOferta')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio de oferta debe ser un número positivo'),
    
  body('categoria')
    .notEmpty()
    .withMessage('La categoría es requerida')
    .isMongoId()
    .withMessage('ID de categoría inválido'),
    
  body('stock')
    .isInt({ min: 0 })
    .withMessage('El stock debe ser un número entero positivo'),
    
  body('marca')
    .optional()
    .isLength({ max: 50 })
    .withMessage('La marca no puede exceder 50 caracteres'),
    
  manejarErroresValidacion
];

// Validaciones para pedido
const validarPedido = [
  body('productos')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto'),
    
  body('productos.*.producto')
    .isMongoId()
    .withMessage('ID de producto inválido'),
    
  body('productos.*.cantidad')
    .isInt({ min: 1, max: 99 })
    .withMessage('La cantidad debe ser entre 1 y 99'),
    
  body('direccionEntrega.nombre')
    .notEmpty()
    .withMessage('El nombre para entrega es requerido'),
    
  body('direccionEntrega.calle')
    .notEmpty()
    .withMessage('La dirección es requerida'),
    
  body('direccionEntrega.ciudad')
    .notEmpty()
    .withMessage('La ciudad es requerida'),
    
  body('direccionEntrega.departamento')
    .notEmpty()
    .withMessage('El departamento es requerido'),
    
  body('metodoPago.tipo')
    .isIn(['PSE', 'Nequi', 'tarjeta_credito'])
    .withMessage('Método de pago inválido'),
    
  manejarErroresValidacion
];

// Validaciones para reseña
const validarReseña = [
  body('calificacion')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser entre 1 y 5'),
    
  body('comentario')
    .notEmpty()
    .withMessage('El comentario es requerido')
    .isLength({ min: 10, max: 1000 })
    .withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
    
  body('titulo')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El título no puede exceder 100 caracteres'),
    
  body('aspectos.calidad')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación de calidad debe ser entre 1 y 5'),
    
  body('aspectos.precio')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación de precio debe ser entre 1 y 5'),
    
  manejarErroresValidacion
];

// Validaciones para categoría
const validarCategoria = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre de la categoría es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
    
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
    
  body('padre')
    .optional()
    .isMongoId()
    .withMessage('ID de categoría padre inválido'),
    
  manejarErroresValidacion
];

// Validaciones para parámetros comunes
const validarId = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido'),
    
  manejarErroresValidacion
];

const validarPaginacion = [
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número positivo'),
    
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser entre 1 y 100'),
    
  manejarErroresValidacion
];

// Validaciones para búsqueda
const validarBusqueda = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 1 y 100 caracteres'),
    
  query('categoria')
    .optional()
    .isMongoId()
    .withMessage('ID de categoría inválido'),
    
  query('precioMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio mínimo debe ser positivo'),
    
  query('precioMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio máximo debe ser positivo'),
    
  query('ordenar')
    .optional()
    .isIn(['precio_asc', 'precio_desc', 'nombre_asc', 'nombre_desc', 'fecha_desc', 'calificacion_desc'])
    .withMessage('Orden inválido'),
    
  manejarErroresValidacion
];

// Validaciones para carrito
const validarAgregarCarrito = [
  body('productoId')
    .notEmpty()
    .withMessage('El ID del producto es requerido')
    .isMongoId()
    .withMessage('ID de producto inválido'),
    
  body('cantidad')
    .isInt({ min: 1, max: 99 })
    .withMessage('La cantidad debe ser entre 1 y 99'),

  body('variantId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('ID de variante inválido'),
    
  manejarErroresValidacion
];

const validarActualizarCantidad = [
  body('cantidad')
    .isInt({ min: 1, max: 99 })
    .withMessage('La cantidad debe ser entre 1 y 99'),

  body('variantId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('ID de variante inválido'),

  manejarErroresValidacion
];

const validarActualizacionProducto = [
  body('nombre')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    
  body('descripcion')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La descripción debe tener entre 10 y 2000 caracteres'),
    
  body('precio')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
    
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El stock debe ser un número entero positivo'),
    
  manejarErroresValidacion
];

// Validación para direcciones
const validarDireccion = [
  body('alias')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El alias debe tener entre 2 y 50 caracteres'),
  
  body('nombreDestinatario')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del destinatario debe tener entre 2 y 100 caracteres'),
  
  body('telefono')
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .isLength({ min: 7 })
    .withMessage('Formato de teléfono inválido'),
  
  body('direccion.calle')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('La dirección debe tener entre 5 y 200 caracteres'),
  
  body('direccion.barrio')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El barrio debe tener entre 2 y 100 caracteres'),
  
  body('direccion.ciudad')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  
  body('direccion.departamento')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El departamento debe tener entre 2 y 100 caracteres'),
  
  body('tipo')
    .optional()
    .isIn(['casa', 'apartamento', 'oficina', 'otro'])
    .withMessage('Tipo de dirección inválido'),
  
  body('instruccionesEntrega')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las instrucciones no pueden exceder 500 caracteres'),
    
  manejarErroresValidacion
];



module.exports = {
  manejarErroresValidacion,
  validarRegistroUsuario,
  validarLoginUsuario,
  validarProducto,
  validarActualizacionProducto,
  validarPedido,
  validarReseña,
  validarCategoria,
  validarId,
  validarPaginacion,
  validarBusqueda,
  validarAgregarCarrito,
  validarActualizarCantidad,
  validarDireccion
}; 