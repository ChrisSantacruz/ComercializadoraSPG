const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const { sendCommerceError } = require('../utils/apiContract');
const {
  normalizeId,
  isProductApproved,
  resolvePurchasableVariant,
  getLineCommerce,
  sanitizeCartLogPayload,
} = require('../utils/productCommerce');

const DELIVERY_TYPES = ['domicilio', 'recoger_establecimiento'];

const populateCartProducts = async (carrito) => {
  await carrito.populate({
    path: 'productos.producto',
    select: 'nombre precio imagenes stock estado comerciante variants',
    populate: {
      path: 'comerciante',
      select: 'nombre'
    }
  });

  return carrito;
};

// @desc    Obtener carrito del usuario
// @route   GET /api/cart
// @access  Private
const obtenerCarrito = async (req, res) => {
  try {
    let carrito = await Cart.findOne({ usuario: req.usuario.id })
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagenes stock estado comerciante variants',
        populate: {
          path: 'comerciante',
          select: 'nombre'
        }
      });

    if (!carrito) {
      carrito = new Cart({
        usuario: req.usuario.id,
        productos: [],
        subtotal: 0,
        impuestos: 0,
        total: 0
      });
      await carrito.save();
    }

    // Verificar disponibilidad de productos
    const productosDisponibles = carrito.productos.filter(item => {
      const variant = item.variantId && item.producto.variants?.find
        ? item.producto.variants.find((v) => normalizeId(v._id) === normalizeId(item.variantId))
        : null;
      const stock = variant ? variant.stock : item.producto.stock;
      return item.producto && ['aprobado', 'approved'].includes(item.producto.estado) && stock > 0 && (!variant || variant.activo !== false);
    });

    if (productosDisponibles.length !== carrito.productos.length) {
      carrito.productos = productosDisponibles;
    }
    
    // SIEMPRE recalcular totales para asegurar que el costo de envío esté actualizado
    carrito.calcularTotales();
    
    // Marcar el campo como modificado para que Mongoose lo guarde
    carrito.markModified('costoEnvio');
    carrito.markModified('total');
    carrito.markModified('subtotal');
    carrito.markModified('impuestos');
    
    await carrito.save();

    successResponse(res, 'Carrito obtenido exitosamente', carrito);

  } catch (error) {
    logger.error('cart_get_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Agregar producto al carrito
// @route   POST /api/cart/add
// @access  Private
const agregarAlCarrito = async (req, res) => {
  try {
    const { productoId, cantidad, variantId } = req.body;
    const cantidadNum = parseInt(cantidad, 10);

    logger.info('cart_add', {
      requestId: req.requestId,
      userId: req.usuario?.id,
      payload: sanitizeCartLogPayload(req.body),
    });

    const producto = await Product.findById(productoId);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    if (!isProductApproved(producto.estado)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Este producto no está disponible para compra',
        codigo: 'PRODUCT_NOT_AVAILABLE',
        accion: 'Elige otro producto del catálogo',
        requestId: req.requestId,
      });
    }

    const selectedVariant = resolvePurchasableVariant(producto, variantId);
    const { availableStock, unitPrice, image } = getLineCommerce(producto, selectedVariant);

    if (availableStock < cantidadNum) {
      return res.status(400).json({
        exito: false,
        mensaje: `Stock insuficiente. Disponible: ${availableStock}`,
        codigo: 'INSUFFICIENT_STOCK',
        accion: 'Reduce la cantidad o elige otra variante',
        requestId: req.requestId,
      });
    }

    // Obtener o crear carrito
    let carrito = await Cart.findOne({ usuario: req.usuario.id });
    if (!carrito) {
      carrito = new Cart({
        usuario: req.usuario.id,
        productos: []
      });
    }

    // Verificar si el producto ya está en el carrito
    const productoExistente = carrito.productos.find(item =>
      item.producto.toString() === productoId && normalizeId(item.variantId) === normalizeId(variantId)
    );

    if (productoExistente) {
      const nuevaCantidad = productoExistente.cantidad + cantidadNum;
      if (nuevaCantidad > availableStock) {
        return res.status(400).json({
          exito: false,
          mensaje: `Stock insuficiente. Disponible: ${availableStock}`,
          codigo: 'INSUFFICIENT_STOCK',
          accion: 'Reduce la cantidad en el carrito',
          requestId: req.requestId,
        });
      }
      productoExistente.cantidad = nuevaCantidad;
    } else {
      carrito.productos.push({
        producto: productoId,
        variantId: selectedVariant?._id,
        variante: selectedVariant
          ? {
              sku: selectedVariant.sku,
              attributes: selectedVariant.attributes,
              imagen: image
            }
          : undefined,
        cantidad: cantidadNum,
        precio: selectedVariant?.precio || producto.precio,
        precioOferta: selectedVariant?.precioOferta || producto.precioOferta,
        subtotal: cantidadNum * unitPrice,
        nombre: producto.nombre,
        imagen: image,
        comerciante: producto.comerciante,
        stockDisponible: availableStock,
        disponible: availableStock >= cantidadNum
      });
    }

    // Recalcular totales (ahora también actualiza subtotales de items)
    carrito.calcularTotales();
    
    // Marcar como modificado
    carrito.markModified('productos');
    carrito.markModified('subtotal');
    carrito.markModified('impuestos');
    carrito.markModified('costoEnvio');
    carrito.markModified('total');
    
    await carrito.save();
    
    await populateCartProducts(carrito);

    successResponse(res, 'Producto agregado al carrito exitosamente', carrito);

  } catch (error) {
    if (sendCommerceError(res, error)) return;
    logger.error('cart_add_failed', {
      requestId: req.requestId,
      message: error.message,
      payload: sanitizeCartLogPayload(req.body),
    });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Actualizar cantidad de producto en carrito
// @route   PUT /api/cart/update/:productId o PUT /api/cart/update
// @access  Private
const actualizarCantidad = async (req, res) => {
  try {
    const { cantidad, productoId, variantId } = req.body;
    const { productId } = req.params;
    
    // Usar productId de la URL si está disponible, sino usar productoId del body
    const idProducto = productId || productoId;

    if (!idProducto) {
      return errorResponse(res, 'ID del producto es requerido', 400);
    }

    if (cantidad <= 0) {
      return errorResponse(res, 'La cantidad debe ser mayor a 0', 400);
    }

    // Verificar stock disponible
    const producto = await Product.findById(idProducto);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    if (!isProductApproved(producto.estado)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Este producto ya no está disponible',
        codigo: 'PRODUCT_NOT_AVAILABLE',
        accion: 'Quita el producto del carrito',
        requestId: req.requestId,
      });
    }

    const selectedVariant = resolvePurchasableVariant(producto, variantId);
    const { availableStock } = getLineCommerce(producto, selectedVariant);
    const cantidadNum = parseInt(cantidad, 10);

    if (availableStock < cantidadNum) {
      return res.status(400).json({
        exito: false,
        mensaje: `Stock insuficiente. Disponible: ${availableStock}`,
        codigo: 'INSUFFICIENT_STOCK',
        accion: 'Reduce la cantidad',
        requestId: req.requestId,
      });
    }

    const carrito = await Cart.findOne({ usuario: req.usuario.id });
    if (!carrito) {
      return errorResponse(res, 'Carrito no encontrado', 404);
    }

    const productoEnCarrito = carrito.productos.find(item =>
      item.producto.toString() === idProducto && normalizeId(item.variantId) === normalizeId(variantId)
    );

    if (!productoEnCarrito) {
      return errorResponse(res, 'Producto no encontrado en el carrito', 404);
    }

    productoEnCarrito.cantidad = cantidadNum;
    
    // Recalcular totales (ahora también actualiza subtotales de items)
    carrito.calcularTotales();
    
    // Marcar como modificado
    carrito.markModified('productos');
    carrito.markModified('subtotal');
    carrito.markModified('impuestos');
    carrito.markModified('total');
    
    await carrito.save();
    
    await populateCartProducts(carrito);

    successResponse(res, 'Cantidad actualizada exitosamente', carrito);

  } catch (error) {
    if (sendCommerceError(res, error)) return;
    logger.error('cart_update_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Eliminar producto del carrito
// @route   DELETE /api/cart/remove/:productoId
// @access  Private
const eliminarDelCarrito = async (req, res) => {
  try {
    const { productoId } = req.params;

    const carrito = await Cart.findOne({ usuario: req.usuario.id });
    if (!carrito) {
      return errorResponse(res, 'Carrito no encontrado', 404);
    }

    const { variantId } = req.query;

    carrito.productos = carrito.productos.filter(item =>
      !(item.producto.toString() === productoId && normalizeId(item.variantId) === normalizeId(variantId))
    );

    // Recalcular totales
    carrito.calcularTotales();
    
    // Marcar como modificado para asegurar que Mongoose guarde los cambios
    carrito.markModified('productos');
    carrito.markModified('subtotal');
    carrito.markModified('impuestos');
    carrito.markModified('costoEnvio');
    carrito.markModified('total');
    
    await carrito.save();
    
    await populateCartProducts(carrito);

    successResponse(res, 'Producto eliminado del carrito exitosamente', carrito);

  } catch (error) {
    console.error('Error eliminando producto del carrito:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Limpiar carrito
// @route   DELETE /api/cart/clear
// @access  Private
const limpiarCarrito = async (req, res) => {
  try {
    const carrito = await Cart.findOne({ usuario: req.usuario.id });
    if (!carrito) {
      return errorResponse(res, 'Carrito no encontrado', 404);
    }

    carrito.productos = [];
    carrito.subtotal = 0;
    carrito.impuestos = 0;
    carrito.costoEnvio = 0;
    carrito.total = 0;
    carrito.cupones = [];
    carrito.tipoEntrega = 'domicilio';

    await carrito.save();

    successResponse(res, 'Carrito limpiado exitosamente', carrito);

  } catch (error) {
    console.error('Error limpiando carrito:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Aplicar cupón de descuento
// @route   POST /api/cart/coupon
// @access  Private
const aplicarCupon = async (req, res) => {
  try {
    const { codigo } = req.body;
    const Coupon = require('../models/Coupon');

    if (!codigo || codigo.trim().length < 3) {
      return errorResponse(res, 'Código de cupón inválido', 400);
    }

    const carrito = await Cart.findOne({ usuario: req.usuario.id })
      .populate('productos.producto', 'precio categoria comerciante');
    
    if (!carrito) {
      return errorResponse(res, 'Carrito no encontrado', 404);
    }

    if (carrito.productos.length === 0) {
      return errorResponse(res, 'El carrito está vacío', 400);
    }

    // Buscar cupón en la base de datos
    const cupon = await Coupon.findOne({ 
      codigo: codigo.toUpperCase(),
      estado: 'activo'
    }).populate(['restricciones.productos', 'restricciones.categorias', 'restricciones.comerciantes']);

    if (!cupon) {
      return errorResponse(res, 'Cupón no encontrado o inactivo', 404);
    }

    // Verificar si el cupón está vigente y disponible
    if (!cupon.estaDisponible) {
      if (cupon.estado === 'expirado') {
        return errorResponse(res, 'Este cupón ha expirado', 400);
      } else if (cupon.estado === 'agotado') {
        return errorResponse(res, 'Este cupón ha alcanzado su límite de uso', 400);
      } else {
        return errorResponse(res, 'Este cupón no está disponible', 400);
      }
    }

    // Verificar si el usuario puede usar este cupón
    if (!cupon.puedeUsarUsuario(req.usuario.id)) {
      return errorResponse(res, 'Has alcanzado el límite de uso para este cupón', 400);
    }

    // Verificar monto mínimo
    if (carrito.subtotal < cupon.montoMinimo) {
      return errorResponse(res, `Compra mínima requerida: $${cupon.montoMinimo.toLocaleString()}`, 400);
    }

    // Verificar si ya se aplicó este cupón
    const cuponAplicado = carrito.cupones.find(c => c.codigo === codigo.toUpperCase());
    if (cuponAplicado) {
      return errorResponse(res, 'Este cupón ya ha sido aplicado', 400);
    }

    // Verificar restricciones de productos/categorías/comerciantes
    if (cupon.restricciones.soloProductosEspecificos) {
      const productosValidos = carrito.productos.filter(item => {
        const producto = item.producto;
        
        // Verificar productos específicos
        if (cupon.restricciones.productos.length > 0) {
          const productoPermitido = cupon.restricciones.productos.some(p => 
            p._id.toString() === producto._id.toString()
          );
          if (productoPermitido) return true;
        }
        
        // Verificar categorías
        if (cupon.restricciones.categorias.length > 0) {
          const categoriaPermitida = cupon.restricciones.categorias.some(c => 
            c._id.toString() === producto.categoria.toString()
          );
          if (categoriaPermitida) return true;
        }
        
        // Verificar comerciantes
        if (cupon.restricciones.comerciantes.length > 0) {
          const comerciantePermitido = cupon.restricciones.comerciantes.some(c => 
            c._id.toString() === producto.comerciante.toString()
          );
          if (comerciantePermitido) return true;
        }
        
        return false;
      });

      if (productosValidos.length === 0) {
        return errorResponse(res, 'Este cupón no es válido para los productos en tu carrito', 400);
      }
    }

    // Calcular descuento
    const descuento = cupon.calcularDescuento(carrito.subtotal, carrito.productos);
    
    if (descuento <= 0) {
      return errorResponse(res, 'No se pudo aplicar descuento con este cupón', 400);
    }

    // Aplicar cupón al carrito
    carrito.cupones.push({
      cuponId: cupon._id,
      codigo: cupon.codigo,
      nombre: cupon.nombre,
      tipoDescuento: cupon.tipoDescuento,
      descuento: descuento,
      esEnvioGratis: cupon.tipoDescuento === 'envio_gratis'
    });

    await carrito.calcularTotales();
    await carrito.save();

    successResponse(res, 'Cupón aplicado exitosamente', {
      carrito,
      cuponAplicado: {
        codigo: cupon.codigo,
        nombre: cupon.nombre,
        descuento: descuento,
        tipoDescuento: cupon.tipoDescuento
      }
    });

  } catch (error) {
    console.error('Error aplicando cupón:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Remover cupón del carrito
// @route   DELETE /api/cart/coupon/:codigo
// @access  Private
const removerCupon = async (req, res) => {
  try {
    const { codigo } = req.params;

    const carrito = await Cart.findOne({ usuario: req.usuario.id });
    if (!carrito) {
      return errorResponse(res, 'Carrito no encontrado', 404);
    }

    const indiceCupon = carrito.cupones.findIndex(c => c.codigo === codigo.toUpperCase());
    if (indiceCupon === -1) {
      return errorResponse(res, 'Cupón no encontrado en el carrito', 404);
    }

    carrito.cupones.splice(indiceCupon, 1);
    await carrito.calcularTotales();
    await carrito.save();

    successResponse(res, 'Cupón removido exitosamente', carrito);

  } catch (error) {
    console.error('Error removiendo cupón:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener cupones disponibles para el usuario
// @route   GET /api/cart/available-coupons
// @access  Private
const obtenerCuponesDisponibles = async (req, res) => {
  try {
    const Coupon = require('../models/Coupon');
    
    const carrito = await Cart.findOne({ usuario: req.usuario.id })
      .populate('productos.producto', 'categoria comerciante');

    if (!carrito || carrito.productos.length === 0) {
      return successResponse(res, 'Cupones disponibles obtenidos', []);
    }

    // Obtener cupones públicos disponibles
    const cupones = await Coupon.find({
      estado: 'activo',
      'configuracion.mostrarEnListaPublica': true,
      fechaInicio: { $lte: new Date() },
      fechaVencimiento: { $gte: new Date() },
      $or: [
        { usoMaximo: null },
        { $expr: { $lt: ['$usoActual', '$usoMaximo'] } }
      ]
    }).select('codigo nombre descripcion tipoDescuento valor montoMinimo restricciones');

    // Filtrar cupones que el usuario puede usar
    const cuponesDisponibles = cupones.filter(cupon => {
      // Verificar si puede usar el cupón
      if (!cupon.puedeUsarUsuario(req.usuario.id)) return false;
      
      // Verificar monto mínimo
      if (carrito.subtotal < cupon.montoMinimo) return false;
      
      // Verificar si ya está aplicado
      const yaAplicado = carrito.cupones.some(c => c.codigo === cupon.codigo);
      if (yaAplicado) return false;
      
      return true;
    });

    successResponse(res, 'Cupones disponibles obtenidos exitosamente', cuponesDisponibles);

  } catch (error) {
    console.error('Error obteniendo cupones disponibles:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Recalcular totales del carrito (útil después de cambios en lógica de cálculo)
// @route   POST /api/cart/recalculate
// @access  Private
const recalcularCarrito = async (req, res) => {
  try {
    let carrito = await Cart.findOne({ usuario: req.usuario.id });
    
    if (!carrito) {
      return errorResponse(res, 'Carrito no encontrado', 404);
    }

    // Forzar recálculo de totales
    carrito.calcularTotales();
    await carrito.save();

    // Repoblar con los datos de productos
    await populateCartProducts(carrito);

    successResponse(res, 'Carrito recalculado exitosamente', carrito);

  } catch (error) {
    console.error('Error recalculando carrito:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Actualizar tipo de entrega del carrito
// @route   PUT /api/cart/delivery-type
// @access  Private
const actualizarTipoEntrega = async (req, res) => {
  try {
    const { tipoEntrega } = req.body;

    if (!DELIVERY_TYPES.includes(tipoEntrega)) {
      return errorResponse(res, 'Tipo de entrega inválido', 400);
    }

    let carrito = await Cart.findOne({ usuario: req.usuario.id });

    if (!carrito) {
      carrito = new Cart({
        usuario: req.usuario.id,
        productos: [],
        tipoEntrega
      });
    } else {
      carrito.tipoEntrega = tipoEntrega;
    }

    carrito.calcularTotales();
    carrito.markModified('tipoEntrega');
    carrito.markModified('costoEnvio');
    carrito.markModified('total');

    await carrito.save();
    await populateCartProducts(carrito);

    successResponse(res, 'Tipo de entrega actualizado exitosamente', carrito);
  } catch (error) {
    console.error('Error actualizando tipo de entrega:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

module.exports = {
  obtenerCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  eliminarDelCarrito,
  limpiarCarrito,
  aplicarCupon,
  removerCupon,
  obtenerCuponesDisponibles,
  recalcularCarrito,
  actualizarTipoEntrega
}; 