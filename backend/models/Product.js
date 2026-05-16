const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida'],
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
  },
  precio: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  precioOferta: {
    type: Number,
    min: [0, 'El precio de oferta no puede ser negativo'],
    validate: {
      validator: function(value) {
        return !value || value < this.precio;
      },
      message: 'El precio de oferta debe ser menor al precio regular'
    }
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La categoría es requerida']
  },
  subcategoria: {
    type: String,
    trim: true
  },
  marca: {
    type: String,
    trim: true
  },
  modelo: {
    type: String,
    trim: true
  },
  
  // Inventario
  stock: {
    type: Number,
    required: false, // Temporal: hacer opcional
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  stockMinimo: {
    type: Number,
    default: 5
  },
  unidadMedida: {
    type: String,
    enum: ['unidad', 'kg', 'gr', 'litro', 'ml', 'metro', 'cm'],
    default: 'unidad'
  },
  
  // Imágenes del producto
  imagenes: [{
    url: {
      type: String,
      required: true
    },
    publicId: String, // Para Cloudinary
    alt: String,
    orden: {
      type: Number,
      default: 0
    }
  }],
  imagenPrincipal: {
    type: String,
    required: false // Temporal: hacer opcional para pruebas
  },
  
  // Características del producto
  especificaciones: [{
    nombre: String,
    valor: String
  }],
  
  // Dimensiones y peso
  dimensiones: {
    largo: Number,
    ancho: Number,
    alto: Number,
    peso: Number,
    unidad: {
      type: String,
      enum: ['cm', 'mm', 'pulg'],
      default: 'cm'
    }
  },
  
  // Comerciante que lo vende
  comerciante: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El comerciante es requerido']
  },
  
  // Estado del producto
  estado: {
    type: String,
    enum: ['aprobado', 'pausado', 'agotado'],
    default: 'aprobado'
  },
  
  // Estadísticas del producto
  estadisticas: {
    vistas: {
      type: Number,
      default: 0
    },
    ventasTotal: {
      type: Number,
      default: 0
    },
    cantidadVendida: {
      type: Number,
      default: 0
    },
    calificacionPromedio: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReseñas: {
      type: Number,
      default: 0
    },
    totalFavoritos: {
      type: Number,
      default: 0
    }
  },
  
  // SEO y búsqueda
  tags: [String],
  palabrasClave: [String],
  slug: {
    type: String,
    unique: true
  },
  
  // Configuración de envío
  envio: {
    pesoEnvio: Number,
    costoEnvio: {
      type: Number,
      default: 0
    },
    envioGratis: {
      type: Boolean,
      default: false
    },
    tiempoEntrega: {
      minimo: Number,
      maximo: Number,
      unidad: {
        type: String,
        enum: ['horas', 'dias', 'semanas'],
        default: 'dias'
      }
    }
  },
  
  // Promociones
  promocion: {
    activa: {
      type: Boolean,
      default: false
    },
    descuento: {
      type: Number,
      min: 0,
      max: 100
    },
    fechaInicio: Date,
    fechaFin: Date,
    descripcion: String
  },
  
  // Fechas importantes
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  fechaAprobacion: Date,
  fechaPublicacion: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
productSchema.index({ nombre: 'text', descripcion: 'text', tags: 'text' });
productSchema.index({ categoria: 1 });
productSchema.index({ comerciante: 1 });
productSchema.index({ estado: 1 });
productSchema.index({ precio: 1 });
productSchema.index({ 'estadisticas.calificacionPromedio': -1 });
productSchema.index({ 'estadisticas.vistas': -1 });
productSchema.index({ fechaCreacion: -1 });
productSchema.index({ slug: 1 });

// Middleware para generar slug antes de guardar
productSchema.pre('save', function(next) {
  if (this.isModified('nombre') || this.isNew) {
    this.slug = this.nombre
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Agregar timestamp para evitar duplicados
    if (this.isNew) {
      this.slug += '-' + Date.now();
    }
  }
  
  this.fechaActualizacion = new Date();
  next();
});

// Virtual para precio con descuento
productSchema.virtual('precioFinal').get(function() {
  if (this.precioOferta && this.precioOferta > 0) {
    return this.precioOferta;
  }
  
  if (this.promocion && this.promocion.activa && this.promocion.descuento > 0) {
    const ahora = new Date();
    if (ahora >= this.promocion.fechaInicio && ahora <= this.promocion.fechaFin) {
      return this.precio * (1 - this.promocion.descuento / 100);
    }
  }
  
  return this.precio;
});

// Virtual para porcentaje de descuento
productSchema.virtual('porcentajeDescuento').get(function() {
  if (this.precioOferta && this.precioOferta > 0) {
    return Math.round(((this.precio - this.precioOferta) / this.precio) * 100);
  }
  
  if (this.promocion && this.promocion.activa && this.promocion.descuento > 0) {
    const ahora = new Date();
    if (ahora >= this.promocion.fechaInicio && ahora <= this.promocion.fechaFin) {
      return this.promocion.descuento;
    }
  }
  
  return 0;
});

// Virtual para disponibilidad
productSchema.virtual('disponible').get(function() {
  return this.estado === 'aprobado' && this.stock > 0;
});

// Virtual para estado de stock
productSchema.virtual('estadoStock').get(function() {
  if (this.stock === 0) return 'agotado';
  if (this.stock <= this.stockMinimo) return 'bajo';
  return 'disponible';
});

// Método para incrementar vistas
productSchema.methods.incrementarVistas = function() {
  this.estadisticas.vistas += 1;
  return this.save();
};

// Método para actualizar calificación
productSchema.methods.actualizarCalificacion = function(nuevaCalificacion, totalReseñas) {
  this.estadisticas.calificacionPromedio = nuevaCalificacion;
  this.estadisticas.totalReseñas = totalReseñas;
  return this.save();
};

// Método para reducir stock
productSchema.methods.reducirStock = function(cantidad) {
  if (this.stock >= cantidad) {
    this.stock -= cantidad;
    this.estadisticas.cantidadVendida += cantidad;
    return this.save();
  }
  throw new Error('Stock insuficiente');
};

// Normalizar URL guardada en BD: rutas relativas /uploads/ se sirven desde la API; el front antecede REACT_APP_API_URL.
const getImageUrl = (url) => {
  if (!url) return null;
  return url;
};

// Transformar el objeto cuando se convierte a JSON
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Transformar imagenPrincipal
    if (ret.imagenPrincipal) {
      ret.imagenPrincipal = getImageUrl(ret.imagenPrincipal);
    }
    
    // Transformar imagenes array
    if (ret.imagenes && Array.isArray(ret.imagenes)) {
      ret.imagenes = ret.imagenes.map(img => ({
        ...img,
        url: getImageUrl(img.url)
      }));
    }
    
    return ret;
  }
});

// Transformar el objeto cuando se usa lean()
productSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    // Transformar imagenPrincipal
    if (ret.imagenPrincipal) {
      ret.imagenPrincipal = getImageUrl(ret.imagenPrincipal);
    }
    
    // Transformar imagenes array
    if (ret.imagenes && Array.isArray(ret.imagenes)) {
      ret.imagenes = ret.imagenes.map(img => ({
        ...img,
        url: getImageUrl(img.url)
      }));
    }
    
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema); 