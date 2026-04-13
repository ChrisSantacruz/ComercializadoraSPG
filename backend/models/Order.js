const mongoose = require('mongoose');

const DELIVERY_TYPES = ['domicilio', 'recoger_establecimiento'];

const orderSchema = new mongoose.Schema({
  numeroOrden: {
    type: String,
    unique: true,
    required: true
  },
  
  // Usuario que realiza el pedido
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El cliente es requerido']
  },
  
  // Productos del pedido
  productos: [{
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    comerciante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nombre: String,
    precio: {
      type: Number,
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true
    },
    imagen: String,
    estado: {
      type: String,
      enum: ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente'
    }
  }],
  
  // Totales del pedido
  subtotal: {
    type: Number,
    required: true
  },
  impuestos: {
    type: Number,
    default: 0
  },
  costoEnvio: {
    type: Number,
    default: 0
  },
  descuentos: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },

  tipoEntrega: {
    type: String,
    enum: DELIVERY_TYPES,
    default: 'domicilio'
  },
  
  // Estado general del pedido
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'procesando', 'enviado', 'entregado', 'cancelado', 'devuelto', 'paid', 'payment_pending', 'payment_failed'],
    default: 'pendiente'
  },
  
  // Información de entrega
  direccionEntrega: {
    nombre: {
      type: String,
      required: true
    },
    telefono: String,
    calle: {
      type: String,
      required: true
    },
    ciudad: {
      type: String,
      required: true
    },
    departamento: {
      type: String,
      required: true
    },
    codigoPostal: String,
    pais: {
      type: String,
      default: 'Colombia'
    },
    instrucciones: String
  },
  
  // Información de pago
  metodoPago: {
    tipo: {
      type: String,
      enum: ['PSE', 'Nequi', 'tarjeta_credito', 'wompi', 'wompi_card'],
      required: true
    },
    transaccionId: String,
    estado: {
      type: String,
      enum: ['pendiente', 'aprobado', 'rechazado', 'procesando'],
      default: 'pendiente'
    },
    fechaPago: Date,
    referencia: String
  },

  // Información específica de Wompi
  paymentInfo: {
    method: {
      type: String,
      enum: ['wompi', 'wompi_card']
    },
    paymentLinkId: String,
    paymentUrl: String,
    transactionId: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'error']
    },
    paidAt: Date,
    failureReason: String
  },
  
  // Información de envío
  envio: {
    empresa: String,
    numeroGuia: String,
    fechaEnvio: Date,
    fechaEntregaEstimada: Date,
    fechaEntregaReal: Date,
    tipoEnvio: {
      type: String,
      enum: ['normal', 'express', 'recoger_tienda'],
      default: 'normal'
    }
  },
  
  // Información de seguimiento (campo mejorado)
  seguimiento: {
    numeroSeguimiento: String,
    transportadora: {
      type: String,
      enum: ['servientrega', 'interrapidisimo', 'coordinadora', 'tcc', 'otro']
    },
    fechaEnvio: Date,
    estadoActual: String,
    historialSeguimiento: [{
      fecha: Date,
      ubicacion: String,
      descripcion: String
    }]
  },
  
  // Historial de estados
  historialEstados: [{
    estado: String,
    fecha: {
      type: Date,
      default: Date.now
    },
    comentario: String,
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Facturación
  facturacion: {
    requiereFactura: {
      type: Boolean,
      default: false
    },
    tipoDocumento: {
      type: String,
      enum: ['CC', 'NIT', 'CE', 'PP'],
      default: 'CC'
    },
    numeroDocumento: String,
    razonSocial: String,
    direccionFacturacion: String
  },
  
  // Confirmación de entrega por el cliente
  entrega: {
    confirmada: {
      type: Boolean,
      default: false
    },
    fechaConfirmacion: Date,
    comentarioCliente: String,
    calificacionEntrega: {
      type: Number,
      min: 1,
      max: 5
    },
    problemas: [{
      tipo: {
        type: String,
        enum: ['producto_dañado', 'producto_incorrecto', 'entrega_tardia', 'producto_faltante', 'otro']
      },
      descripcion: String
    }]
  },

  // Control de reseñas
  reseñas: {
    puedeReseñar: {
      type: Boolean,
      default: false
    },
    fechaHabilitacion: Date,
    recordatorioEnviado: {
      type: Boolean,
      default: false
    }
  },

  // Comentarios y notas
  comentarios: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mensaje: String,
    fecha: {
      type: Date,
      default: Date.now
    },
    esInterno: {
      type: Boolean,
      default: false
    }
  }],
  
  // Fechas importantes
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  fechaCancelacion: Date,
  motivoCancelacion: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
orderSchema.index({ numeroOrden: 1 });
orderSchema.index({ cliente: 1 });
orderSchema.index({ estado: 1 });
orderSchema.index({ fechaCreacion: -1 });
orderSchema.index({ 'productos.comerciante': 1 });
orderSchema.index({ 'metodoPago.estado': 1 });

// Middleware para generar número de orden antes de guardar
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.numeroOrden) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroOrden = `SPG-${timestamp}-${random}`;
  }
  
  this.fechaActualizacion = new Date();
  next();
});

// Virtual para obtener comerciantes únicos
orderSchema.virtual('comerciantes').get(function() {
  const comerciantes = this.productos.map(p => p.comerciante);
  return [...new Set(comerciantes.map(c => c.toString()))];
});

// Virtual para verificar si el pedido puede ser cancelado
orderSchema.virtual('puedeSerCancelado').get(function() {
  return ['pendiente', 'confirmado'].includes(this.estado);
});

// Método para actualizar estado del pedido
orderSchema.methods.actualizarEstado = function(nuevoEstado, comentario, usuario) {
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estado: nuevoEstado,
    comentario,
    usuario
  });
  
  // Actualizar fechas específicas según el estado
  if (nuevoEstado === 'enviado') {
    this.envio.fechaEnvio = new Date();
  } else if (nuevoEstado === 'entregado') {
    this.envio.fechaEntregaReal = new Date();
  } else if (nuevoEstado === 'cancelado') {
    this.fechaCancelacion = new Date();
    this.motivoCancelacion = comentario;
  }
  
  return this.save();
};

// Método para agregar comentario
orderSchema.methods.agregarComentario = function(mensaje, usuario, esInterno = false) {
  this.comentarios.push({
    usuario,
    mensaje,
    esInterno
  });
  return this.save();
};

// Método para calcular total de productos por comerciante
orderSchema.methods.obtenerTotalPorComerciante = function(comercianteId) {
  return this.productos
    .filter(p => p.comerciante.toString() === comercianteId.toString())
    .reduce((total, p) => total + p.subtotal, 0);
};

module.exports = mongoose.model('Order', orderSchema); 