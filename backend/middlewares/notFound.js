const { applyCorsHeaders } = require('./corsConfig');

// Middleware para manejar rutas no encontradas
const notFound = (req, res, next) => {
  applyCorsHeaders(req, res);
  const error = new Error(`Recurso no encontrado - ${req.originalUrl}`);
  res.status(404).json({
    exito: false,
    mensaje: 'Recurso no encontrado',
    ruta: req.originalUrl,
    metodo: req.method,
    sugerencias: [
      'Verifica que la URL sea correcta',
      'Consulta la documentación de la API',
      'Revisa los endpoints disponibles en /'
    ]
  });
};

module.exports = notFound; 