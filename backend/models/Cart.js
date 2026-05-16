const mongoose = require('mongoose');

const DELIVERY_TYPES = ['domicilio', 'recoger_establecimiento'];
const SHIPPING_COST_COP = 18000;

const cartSchema = new mongoose.Schema({
  // Usuario propietario del carrito
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  
  // Productos en el carrito
  productos: [{
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    nombre: String,
    precio: Number,
    precioOferta: Number,
    imagen: String,
    cantidad: {
      type: Number,
      required: true,
      min: [1, 'La cantidad mínima es 1'],
      max: [99, 'La cantidad máxima es 99']
    },
    subtotal: Number,
    comerciante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fechaAgregado: {
      type: Date,
      default: Date.now
    },
    // Para verificar disponibilidad
    stockDisponible: Number,
    disponible: {
      type: Boolean,
      default: true
    }
  }],
  
  // Totales del carrito
  subtotal: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'El subtotal debe ser un número válido'
    }
  },
  
  descuentos: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Los descuentos deben ser un número válido'
    }
  },
  
  impuestos: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Los impuestos deben ser un número válido'
    }
  },
  
  costoEnvio: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'El costo de envío debe ser un número válido'
    }
  },

  tipoEntrega: {
    type: String,
    enum: DELIVERY_TYPES,
    default: 'domicilio'
  },
  
  total: {
    type: Number,
    default: 0,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'El total debe ser un número válido'
    }
  },
  
  // Cupones aplicados
  cupones: [{
    codigo: String,
    descuento: Number,
    tipo: {
      type: String,
      enum: ['porcentaje', 'monto_fijo']
    }
  }],
  
  // Estado del carrito
  estado: {
    type: String,
    enum: ['activo', 'abandonado', 'convertido', 'expirado'],
    default: 'activo'
  },
  
  // Información adicional
  moneda: {
    type: String,
    default: 'COP'
  },
  
  // Fecha de última actividad
  fechaUltimaActividad: {
    type: Date,
    default: Date.now
  },
  
  // Fechas importantes
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

// Índices para mejorar rendimiento
cartSchema.index({ usuario: 1 });
cartSchema.index({ estado: 1 });
cartSchema.index({ fechaUltimaActividad: 1 });
cartSchema.index({ 'productos.producto': 1 });

// Virtual para obtener cantidad total de productos
cartSchema.virtual('cantidadTotal').get(function() {
  return this.productos.reduce((total, producto) => total + producto.cantidad, 0);
});

// Virtual para obtener comerciantes únicos
cartSchema.virtual('comerciantes').get(function() {
  const comerciantes = this.productos.map(p => p.comerciante);
  return [...new Set(comerciantes.map(c => c.toString()))];
});

// Virtual para verificar si el carrito está vacío
cartSchema.virtual('estaVacio').get(function() {
  return this.productos.length === 0;
});

// Middleware para actualizar fechas antes de guardar
cartSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  this.fechaUltimaActividad = new Date();
  
  // Asegurar valores numéricos válidos
  this.subtotal = isNaN(this.subtotal) || !isFinite(this.subtotal) ? 0 : this.subtotal;
  this.descuentos = isNaN(this.descuentos) || !isFinite(this.descuentos) ? 0 : this.descuentos;
  this.impuestos = isNaN(this.impuestos) || !isFinite(this.impuestos) ? 0 : this.impuestos;
  this.costoEnvio = isNaN(this.costoEnvio) || !isFinite(this.costoEnvio) ? 0 : this.costoEnvio;
  this.total = isNaN(this.total) || !isFinite(this.total) ? 0 : this.total;
  
  // Validar productos
  this.productos.forEach(producto => {
    if (isNaN(producto.subtotal) || !isFinite(producto.subtotal)) {
      producto.subtotal = producto.cantidad * (producto.precioOferta || producto.precio || 0);
    }
  });
  
  next();
});

// Método para agregar producto al carrito
cartSchema.methods.agregarProducto = function(producto, cantidad = 1) {
  const productoExistente = this.productos.find(
    p => p.producto.toString() === producto._id.toString()
  );
  
  if (productoExistente) {
    // Actualizar cantidad si el producto ya existe
    productoExistente.cantidad += cantidad;
    productoExistente.subtotal = productoExistente.cantidad * 
      (producto.precioOferta || producto.precio);
  } else {
    // Agregar nuevo producto
    this.productos.push({
      producto: producto._id,
      nombre: producto.nombre,
      precio: producto.precio,
      precioOferta: producto.precioOferta,
      imagen: producto.imagenPrincipal,
      cantidad,
      subtotal: cantidad * (producto.precioOferta || producto.precio),
      comerciante: producto.comerciante,
      stockDisponible: producto.stock,
      disponible: producto.stock >= cantidad
    });
  }
  
  this.calcularTotales();
  return this.save();
};

// Método para actualizar cantidad de producto
cartSchema.methods.actualizarCantidad = function(productoId, nuevaCantidad) {
  const producto = this.productos.find(
    p => p.producto.toString() === productoId.toString()
  );
  
  if (producto) {
    if (nuevaCantidad <= 0) {
      // Eliminar producto si cantidad es 0 o negativa
      this.productos = this.productos.filter(
        p => p.producto.toString() !== productoId.toString()
      );
    } else {
      // Actualizar cantidad
      producto.cantidad = nuevaCantidad;
      producto.subtotal = nuevaCantidad * (producto.precioOferta || producto.precio);
      producto.disponible = producto.stockDisponible >= nuevaCantidad;
    }
    
    this.calcularTotales();
    return this.save();
  }
  
  throw new Error('Producto no encontrado en el carrito');
};

// Método para eliminar producto del carrito
cartSchema.methods.eliminarProducto = function(productoId) {
  this.productos = this.productos.filter(
    p => p.producto.toString() !== productoId.toString()
  );
  
  this.calcularTotales();
  return this.save();
};

// Método para limpiar carrito
cartSchema.methods.limpiar = function() {
  this.productos = [];
  this.cupones = [];
  this.calcularTotales();
  return this.save();
};

// Método para calcular totales
cartSchema.methods.calcularTotales = function() {
  // Primero, recalcular y actualizar el subtotal de cada producto individual
  this.productos.forEach(producto => {
    const precioUnitario = producto.precioOferta || producto.precio || 0;
    const nuevoSubtotal = producto.cantidad * precioUnitario;
    producto.subtotal = nuevoSubtotal;
  });
  
  // Luego, calcular el subtotal total del carrito
  const subtotal = this.productos.reduce((total, producto) => {
    return total + (isNaN(producto.subtotal) ? 0 : producto.subtotal);
  }, 0);
  
  // Aplicar descuentos de cupones
  const descuentos = this.cupones.reduce((total, cupon) => {
    if (cupon.tipo === 'porcentaje') {
      return total + (subtotal * cupon.descuento / 100);
    } else {
      return total + cupon.descuento;
    }
  }, 0);
  
  // Impuestos deshabilitados temporalmente
  const impuestos = 0;
  
  // Costo de envío fijo de $18.000 COP (solo si hay productos en el carrito)
  const costoEnvio = this.productos.length > 0 && this.tipoEntrega !== 'recoger_establecimiento'
    ? SHIPPING_COST_COP
    : 0;
  
  // Calcular total
  const total = subtotal - descuentos + impuestos + costoEnvio;
  
  // Usar set() para asegurar que Mongoose detecte los cambios
  this.set('subtotal', isNaN(subtotal) || subtotal < 0 ? 0 : subtotal);
  this.set('descuentos', isNaN(descuentos) || descuentos < 0 ? 0 : descuentos);
  this.set('impuestos', isNaN(impuestos) || impuestos < 0 ? 0 : impuestos);
  this.set('costoEnvio', costoEnvio);
  this.set('total', isNaN(total) || total < 0 ? 0 : total);
  
  console.log('💰 Totales calculados:', { 
    subtotal: this.subtotal, 
    descuentos: this.descuentos,
    impuestos: this.impuestos, 
    costoEnvio: this.costoEnvio, 
    total: this.total 
  });
};

// Método para aplicar cupón
cartSchema.methods.aplicarCupon = function(codigo, descuento, tipo) {
  // Verificar si el cupón ya fue aplicado
  const cuponExistente = this.cupones.find(c => c.codigo === codigo);
  
  if (!cuponExistente) {
    this.cupones.push({
      codigo,
      descuento,
      tipo
    });
    
    this.calcularTotales();
    return this.save();
  }
  
  throw new Error('El cupón ya fue aplicado');
};

// Método para remover cupón
cartSchema.methods.removerCupon = function(codigo) {
  this.cupones = this.cupones.filter(c => c.codigo !== codigo);
  this.calcularTotales();
  return this.save();
};

// Método para verificar disponibilidad de productos
cartSchema.methods.verificarDisponibilidad = async function() {
  const Product = mongoose.model('Product');
  
  for (let item of this.productos) {
    const producto = await Product.findById(item.producto);
    if (producto) {
      item.stockDisponible = producto.stock;
      item.disponible = producto.stock >= item.cantidad && producto.estado === 'aprobado';
      item.precio = producto.precio;
      item.precioOferta = producto.precioOferta;
      item.subtotal = item.cantidad * (producto.precioOferta || producto.precio);
    } else {
      item.disponible = false;
    }
  }
  
  this.calcularTotales();
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema); 