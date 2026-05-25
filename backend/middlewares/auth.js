const User = require('../models/User');
const { verificarToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const ROLE_ALIASES = {
  user: ['user', 'cliente'],
  cliente: ['user', 'cliente'],
  merchant: ['merchant', 'comerciante'],
  comerciante: ['merchant', 'comerciante'],
  admin: ['admin', 'administrador'],
  administrador: ['admin', 'administrador'],
  superadmin: ['superadmin'],
};

const expandRoles = (roles) =>
  new Set(roles.flatMap((role) => ROLE_ALIASES[role] || [role]));

const hasRole = (actualRole, allowedRoles) => {
  if (!actualRole) return false;
  return expandRoles(allowedRoles).has(actualRole);
};

// Middleware para verificar token JWT
const verificarTokenMiddleware = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Acceso denegado. Token no proporcionado.',
        codigo: 'TOKEN_MISSING'
      });
    }

    const decoded = verificarToken(token);

    const usuario = await User.findById(decoded.id).select('-password');

    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Token inválido. Usuario no encontrado.',
        codigo: 'TOKEN_INVALID'
      });
    }

    if (usuario.estado !== 'activo') {
      return res.status(401).json({
        exito: false,
        mensaje: 'Cuenta inactiva o bloqueada.',
        codigo: 'ACCOUNT_INACTIVE'
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        exito: false,
        mensaje: 'Token inválido.',
        codigo: 'TOKEN_INVALID'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        exito: false,
        mensaje: 'Token expirado.',
        codigo: 'TOKEN_EXPIRED'
      });
    }

    logger.error('auth_token_verify_failed', { message: error.message });
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.'
    });
  }
};

// Middleware para verificar roles
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Acceso denegado. Usuario no autenticado.'
      });
    }
    
    if (!hasRole(req.usuario.rol, rolesPermitidos)) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Acceso denegado. Permisos insuficientes.',
        rolRequerido: rolesPermitidos,
        rolActual: req.usuario.rol
      });
    }
    
    next();
  };
};

// Middleware específicos por rol
const soloComerciante = verificarRol('comerciante');
const soloCliente = verificarRol('cliente', 'comerciante');
const soloAdmin = verificarRol('admin', 'superadmin');

// Middleware para verificar propiedad del recurso
const verificarPropiedad = (modeloNombre, campoPropietario = 'usuario') => {
  return async (req, res, next) => {
    try {
      const Modelo = require(`../models/${modeloNombre}`);
      const recursoId = req.params.id;
      
      const recurso = await Modelo.findById(recursoId);
      
      if (!recurso) {
        return res.status(404).json({
          exito: false,
          mensaje: `${modeloNombre} no encontrado.`
        });
      }
      
      // Verificar si el usuario es propietario del recurso
      const propietarioId = recurso[campoPropietario];
      
      if (propietarioId.toString() !== req.usuario._id.toString()) {
        return res.status(403).json({
          exito: false,
          mensaje: 'Acceso denegado. No tienes permisos para este recurso.'
        });
      }
      
      req.recurso = recurso;
      next();
      
    } catch (error) {
      logger.error('resource_ownership_check_failed', { message: error.message, modeloNombre });
      return res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor.'
      });
    }
  };
};

// Middleware para verificar si el comerciante puede realizar la acción
const verificarComercianteActivo = async (req, res, next) => {
  try {
    if (!hasRole(req.usuario.rol, ['merchant'])) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Solo los comerciantes pueden realizar esta acción.'
      });
    }
    
    // Verificar estadísticas del comerciante si es necesario
    if (hasRole(req.usuario.rol, ['merchant'])) {
      // Aquí se pueden agregar validaciones adicionales
      // como límites de productos, verificación de documentos, etc.
    }
    
    next();
    
  } catch (error) {
    logger.error('merchant_check_failed', { message: error.message });
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.'
    });
  }
};

// Middleware para verificar compra antes de reseña
const verificarCompraParaReseña = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { productoId } = req.params;
    
    // Buscar si el usuario compró el producto
    const pedido = await Order.findOne({
      cliente: req.usuario._id,
      'productos.producto': productoId,
      estado: 'entregado'
    });
    
    if (!pedido) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Solo puedes reseñar productos que hayas comprado.'
      });
    }
    
    req.pedidoCompra = pedido;
    next();
    
  } catch (error) {
    logger.error('review_purchase_check_failed', { message: error.message });
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.'
    });
  }
};

// Middleware opcional (para rutas que pueden o no requerir autenticación)
const autenticacionOpcional = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      try {
        const decoded = verificarToken(token);
        const usuario = await User.findById(decoded.id).select('-password');

        if (usuario && usuario.estado === 'activo') {
          req.usuario = usuario;
        }
      } catch (error) {
        // Token inválido o expirado, pero continuamos sin usuario
      }
    }
    
    next();
    
  } catch (error) {
    logger.warn('optional_auth_failed', { message: error.message });
    next(); // Continuamos sin usuario autenticado
  }
};

module.exports = {
  verificarToken: verificarTokenMiddleware,
  protect: verificarTokenMiddleware,
  verificarRol,
  authorize: verificarRol,
  soloComerciante,
  soloCliente,
  soloAdmin,
  verificarPropiedad,
  verificarComercianteActivo,
  verificarCompraParaReseña,
  autenticacionOpcional,
  hasRole
}; 