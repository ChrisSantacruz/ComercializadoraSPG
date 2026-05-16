const logger = require('../utils/logger');

// Middleware para manejo global de errores
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  const requestId = req.requestId;

  if (err.message && String(err.message).toLowerCase().includes('cors')) {
    logger.warn('cors_denied', { requestId, path: req.path, origin: req.get('Origin') });
    return res.status(403).json({
      exito: false,
      mensaje: 'Origen no permitido por política CORS',
      requestId,
    });
  }

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errores = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      exito: false,
      mensaje: 'Error de validación',
      errores: errores
    });
  }

  // Error de duplicado (código 11000)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    const valor = err.keyValue[campo];
    
    let mensaje = 'Recurso duplicado';
    
    // Mensajes específicos según el campo
    switch (campo) {
      case 'email':
        mensaje = 'Este email ya está registrado';
        break;
      case 'numeroOrden':
        mensaje = 'Número de orden duplicado';
        break;
      case 'slug':
        mensaje = 'Este identificador ya existe';
        break;
      default:
        mensaje = `El ${campo} '${valor}' ya existe`;
    }
    
    return res.status(400).json({
      exito: false,
      mensaje: mensaje,
      campo: campo
    });
  }

  // Error de cast de Mongoose (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      exito: false,
      mensaje: 'ID de recurso inválido',
      campo: err.path
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      exito: false,
      mensaje: 'Token inválido'
    });
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      exito: false,
      mensaje: 'Token expirado'
    });
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Formato JSON inválido'
    });
  }

  // Error de archivo muy grande
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      exito: false,
      mensaje: 'El archivo es demasiado grande'
    });
  }

  // Error de tipo de archivo
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      exito: false,
      mensaje: 'Tipo de archivo no permitido'
    });
  }

  // Error de conexión de base de datos
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    logger.error('database_error', { requestId, message: err.message, name: err.name });
    return res.status(500).json({
      exito: false,
      mensaje: 'Error de base de datos',
      requestId,
    });
  }

  // Error de rate limiting
  if (err.statusCode === 429) {
    return res.status(429).json({
      exito: false,
      mensaje: 'Demasiadas peticiones, intenta de nuevo más tarde'
    });
  }

  // Errores específicos de la aplicación
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      exito: false,
      mensaje: err.message || 'Error del servidor'
    });
  }

  // Error interno del servidor por defecto
  logger.error('unhandled_route_error', {
    requestId,
    message: err.message,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  res.status(500).json({
    exito: false,
    mensaje: 'Error interno del servidor',
    requestId,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
};

module.exports = errorHandler; 