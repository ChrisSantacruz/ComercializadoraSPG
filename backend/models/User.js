const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Email inválido']
  },
  password: {
    type: String,
    required: function() {
      // Solo requerida si no es autenticación social
      return !this.proveedor || this.proveedor === 'local';
    },
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  telefono: {
    type: String,
    trim: true,
    match: [/^[\+]?[\d\s\-\(\)]{10,15}$/, 'Número de teléfono inválido']
  },
  
  // Campos para autenticación social
  proveedor: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  proveedorId: {
    type: String,
    sparse: true // Permite múltiples documentos con null
  },
  fotoPerfilSocial: {
    type: String,
    default: null
  },
  rol: {
    type: String,
    enum: ['cliente', 'comerciante', null],
    default: null // Null para usuarios OAuth que aún no seleccionan rol
  },
  
  // Información de comerciante
  nombreEmpresa: {
    type: String,
    trim: true,
    maxlength: [100, 'El nombre de la empresa no puede exceder 100 caracteres']
  },
  descripcionEmpresa: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  categoriaEmpresa: {
    type: String,
    enum: ['Alimentación', 'Tecnología', 'Ropa', 'Hogar', 'Salud', 'Servicios', 'Deportes', 'Libros', 'Artesanías', 'Otro'],
    sparse: true
  },
  sitioWeb: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'URL inválida']
  },
  redesSociales: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
  horarioAtencion: {
    lunes: { apertura: String, cierre: String, cerrado: Boolean },
    martes: { apertura: String, cierre: String, cerrado: Boolean },
    miercoles: { apertura: String, cierre: String, cerrado: Boolean },
    jueves: { apertura: String, cierre: String, cerrado: Boolean },
    viernes: { apertura: String, cierre: String, cerrado: Boolean },
    sabado: { apertura: String, cierre: String, cerrado: Boolean },
    domingo: { apertura: String, cierre: String, cerrado: Boolean }
  },
  tipoDocumento: {
    type: String,
    enum: ['NIT', 'RUT', 'Cedula', 'Pasaporte'],
    sparse: true
  },
  numeroDocumento: {
    type: String,
    trim: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'bloqueado'],
    default: 'activo'
  },
  verificado: {
    type: Boolean,
    default: false
  },
  
  // Configuración de usuario
  configuracion: {
    pais: {
      type: String,
      default: 'Colombia'
    },
    region: {
      type: String,
      default: ''
    },
    idioma: {
      type: String,
      enum: ['es', 'en'],
      default: 'es'
    },
    moneda: {
      type: String,
      default: 'COP'
    }
  },

  // Dirección de envío
  direccion: {
    calle: String,
    ciudad: String,
    departamento: String,
    codigoPostal: String,
    pais: {
      type: String,
      default: 'Colombia'
    }
  },

  // Métodos de pago guardados
  metodosPago: [{
    tipo: {
      type: String,
      enum: ['PSE', 'Nequi', 'tarjeta_credito'],
      required: true
    },
    nombre: String,
    // Para PSE
    banco: String,
    // Para tarjeta
    ultimosCuatroDigitos: String,
    tipoTarjeta: String,
    // Para Nequi
    numeroNequi: String,
    fechaCreacion: {
      type: Date,
      default: Date.now
    }
  }],

  // Lista de favoritos (solo para clientes)
  favoritos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Historial de pedidos
  historialPedidos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],

  // Para comerciantes - estadísticas
  estadisticasComerciante: {
    totalVentas: {
      type: Number,
      default: 0
    },
    productosVendidos: {
      type: Number,
      default: 0
    },
    calificacionPromedio: {
      type: Number,
      default: 0
    },
    totalReseñas: {
      type: Number,
      default: 0
    }
  },

  // Tokens para verificación y recuperación
  tokenVerificacion: String,
  codigoVerificacion: String,
  codigoExpiracion: Date,
  fechaVerificacion: Date,
  tokenRecuperacion: String,
  fechaRecuperacion: Date,
  
  // Sistema de "Recuérdame" y 2FA
  recordarme: {
    type: Boolean,
    default: false
  },
  tokenRecordatorio: String, // Token persistente para auto-login
  fechaExpiracionRecordatorio: Date,
  codigo2FA: String, // Código temporal para login sin "recuérdame"
  fechaExpiracion2FA: Date,
  
  // Fechas importantes
  fechaUltimoLogin: Date,
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento (email ya tiene índice único automático)
userSchema.index({ rol: 1 });
userSchema.index({ estado: 1 });
userSchema.index({ 'configuracion.pais': 1 });
// Índice para proveedores sociales (solo se crea cuando proveedorId existe)
userSchema.index({ proveedorId: 1 }, { unique: true, sparse: true });

// Middleware para hash de contraseña antes de guardar
userSchema.pre('save', async function(next) {
  // No hashear si no hay contraseña o no se ha modificado
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.compararPassword = async function(passwordCandidato) {
  return await bcrypt.compare(passwordCandidato, this.password);
};

// Devolver URL tal cual: /uploads/ la resuelve el front con REACT_APP_API_URL
const getImageUrl = (url) => {
  if (!url) return null;
  return url;
};

// Método para obtener datos del usuario sin información sensible
userSchema.methods.toJSON = function() {
  const usuario = this.toObject();
  delete usuario.password;
  delete usuario.tokenVerificacion;
  delete usuario.tokenRecuperacion;
  
  // Transformar URLs de imágenes
  if (usuario.avatar) {
    usuario.avatar = getImageUrl(usuario.avatar);
  }
  if (usuario.banner) {
    usuario.banner = getImageUrl(usuario.banner);
  }
  
  return usuario;
};

// Virtual para el nombre completo
userSchema.virtual('nombreCompleto').get(function() {
  return this.nombre;
});

// Virtual para contar productos favoritos
userSchema.virtual('totalFavoritos').get(function() {
  return this.favoritos ? this.favoritos.length : 0;
});

// Middleware para actualizar fechaActualizacion
userSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema); 