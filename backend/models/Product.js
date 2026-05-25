const mongoose = require('mongoose');
const { mediaSchema } = require('../schemas/mediaSchema');

const variantImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: String,
  alt: String,
  orden: {
    type: Number,
    default: 0
  }
}, { _id: false });

const productVariantSchema = new mongoose.Schema({
  sku: {
    type: String,
    trim: true
  },
  attributes: {
    type: Map,
    of: String,
    default: {}
  },
  precio: {
    type: Number,
    min: [0, 'El precio de la variante no puede ser negativo']
  },
  precioOferta: {
    type: Number,
    min: [0, 'El precio de oferta de la variante no puede ser negativo']
  },
  stock: {
    type: Number,
    min: [0, 'El stock de la variante no puede ser negativo'],
    default: 0
  },
  imagenes: [variantImageSchema],
  activo: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const normalizeAttributeValue = (value) => String(value || '').trim();

const getAttributesSignature = (attributes) => {
  const raw = attributes instanceof Map ? Object.fromEntries(attributes) : (attributes || {});
  return Object.entries(raw)
    .map(([key, value]) => [String(key).trim().toLowerCase(), normalizeAttributeValue(value).toLowerCase()])
    .filter(([key, value]) => key && value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
};

const buildVariantSku = (productName, index, attributes) => {
  const base = String(productName || 'SPG')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'SPG';
  const attrPart = getAttributesSignature(attributes)
    .replace(/[^a-z0-9|:-]/gi, '-')
    .replace(/[:|]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 28);
  return [base, attrPart || `VAR-${index + 1}`].join('-');
};

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
  
  // Medios canónicos (imágenes + videos) — contrato estable para frontend / futuro CDN
  media: [mediaSchema],

  // Imágenes legacy (sincronizadas desde media en pre-save)
  imagenes: [{
    url: {
      type: String,
      required: true
    },
    publicId: String,
    alt: String,
    orden: {
      type: Number,
      default: 0
    }
  }],
  imagenPrincipal: {
    type: String,
    required: false
  },

  variants: [productVariantSchema],
  
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
    enum: ['pending', 'approved', 'rejected', 'suspended', 'aprobado', 'pausado', 'agotado', 'pendiente', 'rechazado', 'suspendido'],
    default: 'pending'
  },
  moderacion: {
    estado: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    razonRechazo: {
      type: String,
      trim: true,
      maxlength: [500, 'La razón de moderación no puede exceder 500 caracteres']
    },
    moderadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fechaModeracion: Date
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
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'variants.attributes': 1 });

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
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    const signatures = new Set();
    const skus = new Set();
    let defaultFound = false;

    this.variants.forEach((variant, index) => {
      const attrs = variant.attributes instanceof Map
        ? Object.fromEntries(variant.attributes)
        : (variant.attributes || {});

      Object.keys(attrs).forEach((key) => {
        const normalized = normalizeAttributeValue(attrs[key]);
        if (normalized) {
          attrs[key] = normalized;
        } else {
          delete attrs[key];
        }
      });

      const signature = getAttributesSignature(attrs);
      if (!signature) {
        throw new Error('Cada variante debe tener al menos un atributo visible.');
      }
      if (signatures.has(signature)) {
        throw new Error('No puede haber dos variantes con la misma combinación de atributos.');
      }
      signatures.add(signature);

      variant.attributes = attrs;
      variant.precio = Number.isFinite(Number(variant.precio)) ? Number(variant.precio) : this.precio;
      variant.stock = Number.isFinite(Number(variant.stock)) ? Number(variant.stock) : 0;
      variant.activo = variant.activo !== false;

      if (!variant.sku) {
        variant.sku = buildVariantSku(this.nombre, index, attrs);
      }
      if (skus.has(variant.sku)) {
        variant.sku = `${variant.sku}-${index + 1}`;
      }
      skus.add(variant.sku);

      if (variant.isDefault && !defaultFound) {
        defaultFound = true;
      } else {
        variant.isDefault = false;
      }
    });

    const activeVariants = this.variants.filter((variant) => variant.activo !== false);
    if (!defaultFound && activeVariants.length > 0) {
      activeVariants[0].isDefault = true;
    }

    if (activeVariants.length > 0) {
      const prices = activeVariants
        .map((variant) => Number(variant.precioOferta || variant.precio))
        .filter((price) => Number.isFinite(price) && price >= 0);
      const defaultVariant = activeVariants.find((variant) => variant.isDefault) || activeVariants[0];

      this.stock = activeVariants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0);
      if (prices.length > 0) {
        this.precio = Math.min(...prices);
      }
      if (defaultVariant?.imagenes?.length) {
        this.imagenPrincipal = defaultVariant.imagenes[0].url;
      }
    }
  }

  // Sincronizar imagenes legacy desde media (imágenes ordenadas)
  if (Array.isArray(this.media) && this.media.length > 0) {
    const imageMedia = this.media
      .filter((m) => m.type === 'image')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.imagenes = imageMedia.map((m, i) => ({
      url: m.url,
      publicId: m.publicId || null,
      alt: m.alt || `${this.nombre || 'Producto'} - Imagen ${i + 1}`,
      orden: m.order ?? i,
    }));
    if (imageMedia.length > 0) {
      this.imagenPrincipal = imageMedia[0].url;
    }
  }

  this.fechaActualizacion = new Date();
  next();
});

// Virtual para precio con descuento
productSchema.virtual('precioFinal').get(function() {
  const defaultVariant = Array.isArray(this.variants)
    ? this.variants.find((variant) => variant.activo !== false && variant.isDefault) || this.variants.find((variant) => variant.activo !== false)
    : null;

  if (defaultVariant) {
    return defaultVariant.precioOferta && defaultVariant.precioOferta > 0
      ? defaultVariant.precioOferta
      : defaultVariant.precio;
  }

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
  const stock = Array.isArray(this.variants) && this.variants.length > 0
    ? this.variants
        .filter((variant) => variant.activo !== false)
        .reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)
    : this.stock;
  return ['approved', 'aprobado'].includes(this.estado) && stock > 0;
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

productSchema.methods.getVariantById = function(variantId) {
  if (!variantId || !Array.isArray(this.variants)) return null;
  return this.variants.id(variantId) || null;
};

productSchema.methods.reducirStockVariante = function(variantId, cantidad) {
  const variant = this.getVariantById(variantId);
  if (!variant || variant.activo === false) {
    throw new Error('Variante no disponible');
  }
  if (variant.stock < cantidad) {
    throw new Error('Stock insuficiente para la variante seleccionada');
  }
  variant.stock -= cantidad;
  this.stock = Math.max(0, (this.stock || 0) - cantidad);
  this.estadisticas.cantidadVendida += cantidad;
  return this.save();
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

    if (ret.media && Array.isArray(ret.media)) {
      ret.media = ret.media.map((m) => ({
        ...m,
        url: getImageUrl(m.url),
        thumbnail: m.thumbnail ? getImageUrl(m.thumbnail) : undefined,
      }));
    }

    if (ret.variants && Array.isArray(ret.variants)) {
      ret.variants = ret.variants.map(variant => ({
        ...variant,
        attributes: variant.attributes instanceof Map ? Object.fromEntries(variant.attributes) : variant.attributes,
        imagenes: Array.isArray(variant.imagenes)
          ? variant.imagenes.map(img => ({ ...img, url: getImageUrl(img.url) }))
          : []
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

    if (ret.media && Array.isArray(ret.media)) {
      ret.media = ret.media.map((m) => ({
        ...m,
        url: getImageUrl(m.url),
        thumbnail: m.thumbnail ? getImageUrl(m.thumbnail) : undefined,
      }));
    }

    if (ret.variants && Array.isArray(ret.variants)) {
      ret.variants = ret.variants.map(variant => ({
        ...variant,
        attributes: variant.attributes instanceof Map ? Object.fromEntries(variant.attributes) : variant.attributes,
        imagenes: Array.isArray(variant.imagenes)
          ? variant.imagenes.map(img => ({ ...img, url: getImageUrl(img.url) }))
          : []
      }));
    }
    
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema); 