const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { successResponse, errorResponse, paginateData, validarObjectId } = require('../utils/helpers');
const { enviarNotificacion } = require('../services/notificationService');
const mongoose = require('mongoose');

const SHIPPING_COST_COP = 18000;

// Forzar recarga del módulo - temporal

// @desc    Crear nuevo pedido
// @route   POST /api/orders
// @access  Private
const crearPedido = async (req, res) => {
  try {
    const { productos, direccionEntrega, metodoPago, tipoEntrega = 'domicilio', comentarios } = req.body;
    const clienteId = req.usuario.id;
    const esRecogidaEstablecimiento = tipoEntrega === 'recoger_establecimiento';

    const cliente = await User.findById(clienteId).select('nombre telefono');

    // Si direccionEntrega es un string (ID), buscar la dirección
    let direccionCompleta = direccionEntrega;
    if (!esRecogidaEstablecimiento && typeof direccionEntrega === 'string') {
      const Address = require('../models/Address');
      const direccion = await Address.findById(direccionEntrega);
      if (!direccion) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Dirección de entrega no encontrada'
        });
      }
      direccionCompleta = direccion;
    }

    if (!esRecogidaEstablecimiento && !direccionCompleta) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La dirección de entrega es requerida para envíos a domicilio'
      });
    }

    // Validar que hay productos
    if (!productos || productos.length === 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Debe incluir al menos un producto'
      });
    }

    let subtotal = 0;
    const productosValidos = [];

    // Validar cada producto y calcular totales
    for (const item of productos) {
      const producto = await Product.findById(item.producto);
      if (!producto) {
        return res.status(400).json({
          exito: false,
          mensaje: `Producto ${item.producto} no encontrado`
        });
      }

      if (producto.stock < item.cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: `Stock insuficiente para ${producto.nombre}`
        });
      }

      const precioFinal = producto.precioOferta || producto.precio;
      const subtotalItem = precioFinal * item.cantidad;
      subtotal += subtotalItem;

      productosValidos.push({
        producto: producto._id,
        comerciante: producto.comerciante,
        nombre: producto.nombre,
        precio: precioFinal,
        cantidad: item.cantidad,
        subtotal: subtotalItem,
        imagen: producto.imagenPrincipal || (producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes[0].url : '') || ''
      });

      // NO descontar stock aquí - se descontará cuando se confirme el pago
    }

    // Calcular impuestos y total
    const impuestos = Math.round(subtotal * 0.15);
    const costoEnvio = esRecogidaEstablecimiento ? 0 : SHIPPING_COST_COP;
    const total = subtotal + impuestos + costoEnvio;

    const instruccionesEntrega = esRecogidaEstablecimiento
      ? ['Recoger en establecimiento', comentarios].filter(Boolean).join('. ')
      : [direccionCompleta.instruccionesEntrega, comentarios].filter(Boolean).join('. ');

    const direccionNormalizada = esRecogidaEstablecimiento
      ? {
          nombre: cliente?.nombre || 'Cliente',
          telefono: cliente?.telefono || '',
          calle: 'Recoger en establecimiento',
          ciudad: 'Coordinar con el comercio',
          departamento: 'Sin envío',
          codigoPostal: '',
          pais: 'Colombia',
          instrucciones: instruccionesEntrega
        }
      : {
          nombre: direccionCompleta.nombreDestinatario,
          telefono: direccionCompleta.telefono,
          calle: direccionCompleta.direccion.calle,
          ciudad: direccionCompleta.direccion.ciudad,
          departamento: direccionCompleta.direccion.departamento,
          codigoPostal: direccionCompleta.direccion.codigoPostal || '',
          pais: direccionCompleta.direccion.pais || 'Colombia',
          instrucciones: instruccionesEntrega
        };

    // Generar número de orden único
    const numeroOrden = `SPG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Crear el pedido
    const nuevoPedido = new Order({
      numeroOrden,
      cliente: clienteId,
      productos: productosValidos,
      subtotal,
      impuestos,
      costoEnvio,
      descuentos: 0,
      total,
      tipoEntrega,
      estado: 'pendiente',
      direccionEntrega: direccionNormalizada,
      metodoPago: {
        tipo: metodoPago.tipo,
        estado: 'pendiente',
        transaccionId: `TXN_${Date.now()}`,
        fechaPago: new Date()
      },
      envio: {
        tipoEnvio: esRecogidaEstablecimiento ? 'recoger_tienda' : 'normal'
      }
    });

    await nuevoPedido.save();

    // Notificar a los comerciantes sobre el nuevo pedido y actualizar estadísticas
    try {
      const comerciantesNotificados = new Set();
      
      for (const item of productosValidos) {
        if (!comerciantesNotificados.has(item.comerciante.toString())) {
          // Buscar el comerciante
          const comerciante = await User.findById(item.comerciante);
          if (comerciante) {
            // Actualizar estadísticas del comerciante
            const productosComerciante = productosValidos.filter(p => p.comerciante.toString() === item.comerciante.toString());
            const totalVenta = productosComerciante.reduce((sum, p) => sum + p.subtotal, 0);
            
            await User.findByIdAndUpdate(comerciante._id, {
              $inc: {
                'estadisticas.productosVendidos': productosComerciante.length,
                'estadisticas.ingresosTotales': totalVenta,
                'estadisticas.pedidosRealizados': 1
              }
            });

            // Crear notificación para el comerciante
            const Notification = require('../models/Notification');
            await Notification.create({
              usuario: comerciante._id,
              tipo: 'nueva_venta',
              titulo: '¡Nueva venta realizada!',
              mensaje: `Has vendido ${productosComerciante.length} producto(s) por un total de $${totalVenta.toLocaleString()} COP`,
              datos: {
                elementoId: nuevoPedido._id,
                tipoElemento: 'pedido',
                url: `/merchant/orders/${nuevoPedido._id}`,
                accion: 'ver_pedido',
                datosExtra: {
                  numeroOrden: nuevoPedido.numeroOrden,
                  cantidadProductos: productosComerciante.length,
                  total: totalVenta
                }
              },
              prioridad: 'alta',
              canales: {
                enApp: true,
                email: true
              }
            });
            
            comerciantesNotificados.add(item.comerciante.toString());
          }
        }
      }
    } catch (notifError) {
      console.error('Error enviando notificaciones a comerciantes:', notifError);
      // No fallar el pedido por error en notificaciones
    }

    // Limpiar carrito del usuario
    await Cart.findOneAndUpdate(
      { usuario: clienteId },
      {
        $set: {
          productos: [],
          subtotal: 0,
          impuestos: 0,
          costoEnvio: 0,
          descuentos: 0,
          total: 0,
          tipoEntrega: 'domicilio'
        }
      }
    );

    res.status(201).json({
      exito: true,
      mensaje: 'Pedido creado exitosamente',
      datos: nuevoPedido
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      errores: [error.message]
    });
  }
};

// @desc    Obtener pedidos del cliente
// @route   GET /api/orders/my-orders
// @access  Private
const obtenerMisPedidos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const estado = req.query.estado;

    console.log(`🔍 Buscando pedidos para cliente: ${req.usuario.id}`);
    console.log(`📋 Parámetros: página=${page}, límite=${limit}, estado=${estado}`);

    let filtros = { cliente: req.usuario.id };
    if (estado && estado !== '' && estado !== 'todos') {
      filtros.estado = estado;
    }

    console.log('🔍 Filtros aplicados:', filtros);

    const pedidos = await Order.find(filtros)
      .populate('cliente', 'nombre email telefono')
      .populate('productos.producto', 'nombre imagenes comerciante')
      .populate('productos.comerciante', 'nombre')
      .sort({ createdAt: -1, _id: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * parseInt(limit));

    const total = await Order.countDocuments(filtros);

    console.log(`📦 Pedidos encontrados para cliente ${req.usuario.id}: ${pedidos.length} de ${total} total`);

    // Log detallado de cada pedido encontrado
    pedidos.forEach((pedido, index) => {
      console.log(`   ${index + 1}. ${pedido.numeroOrden} - Estado: ${pedido.estado} - Cliente: ${pedido.cliente?.nombre || 'N/A'}`);
    });

    // Si no hay pedidos, devolver respuesta vacía pero exitosa
    if (pedidos.length === 0) {
      console.log('ℹ️ No se encontraron pedidos para este cliente');
    }

    res.json({
      exito: true,
      mensaje: pedidos.length > 0 ? 'Pedidos obtenidos exitosamente' : 'No tienes pedidos aún',
      datos: pedidos,
      paginacion: {
        paginaActual: parseInt(page),
        totalPaginas: Math.ceil(total / limit),
        totalElementos: total,
        elementosPorPagina: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo pedidos del cliente:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      errores: [error.message]
    });
  }
};

// @desc    Obtener pedidos del comerciante
// @route   GET /api/orders/merchant-orders
// @access  Private (Comerciante)
const obtenerOrdenesComerciante = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const estado = req.query.estado;

    console.log(`🔍 Buscando pedidos para comerciante: ${req.usuario.id}`);
    console.log(`📋 Parámetros: página=${page}, límite=${limit}, estado=${estado}`);

    // Convertir el ID del comerciante a ObjectId si es necesario
    const comercianteId = new mongoose.Types.ObjectId(req.usuario.id);

    let filtros = {};
    if (estado && estado !== 'todos') {
      filtros.estado = estado;
    }

    console.log('🔍 Filtros aplicados:', filtros);

    // Buscar órdenes que contengan productos del comerciante
    const agregacion = [
      {
        $match: {
          ...filtros,
          'productos.comerciante': comercianteId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'cliente',
          foreignField: '_id',
          as: 'cliente'
        }
      },
      {
        $unwind: '$cliente'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productos.producto',
          foreignField: '_id',
          as: 'productosData'
        }
      },
      {
        $sort: { createdAt: -1, _id: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ];

    console.log('🔧 Ejecutando agregación para comerciante...');
    const ordenes = await Order.aggregate(agregacion);

    // Contar total
    const totalAgregacion = [
      {
        $match: {
          ...filtros,
          'productos.comerciante': comercianteId
        }
      },
      {
        $count: 'total'
      }
    ];

    const totalResult = await Order.aggregate(totalAgregacion);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    console.log(`📦 Órdenes de comerciante encontradas: ${ordenes.length} de ${total} total`);

    // Log detallado de cada orden encontrada
    ordenes.forEach((orden, index) => {
      console.log(`   ${index + 1}. ${orden.numeroOrden} - Estado: ${orden.estado} - Cliente: ${orden.cliente?.nombre || 'N/A'}`);
    });

    if (ordenes.length === 0) {
      console.log('ℹ️ No se encontraron órdenes para este comerciante');
    }

    res.json({
      exito: true,
      mensaje: ordenes.length > 0 ? 'Órdenes obtenidas exitosamente' : 'No tienes órdenes aún',
      datos: ordenes,
      paginacion: {
        paginaActual: parseInt(page),
        totalPaginas: Math.ceil(total / limit),
        totalElementos: total,
        elementosPorPagina: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo órdenes del comerciante:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      errores: [error.message]
    });
  }
};

// @desc    Actualizar estado de orden (comerciante)
// @route   PUT /api/orders/:id/update-status
// @access  Private (Comerciante)
const actualizarEstadoOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, numeroSeguimiento, transportadora } = req.body;
    const comercianteId = req.usuario.id;

    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(id)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de orden inválido'
      });
    }

    console.log(`🔄 Actualizando orden ${id} a estado: ${estado}`);

    // Validar que la orden existe
    const orden = await Order.findById(id).populate('productos.producto');
    if (!orden) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Orden no encontrada'
      });
    }

    // Verificar que el comerciante es dueño de al menos un producto en la orden
    const esComercianteDeLaOrden = orden.productos.some(item => 
      item.comerciante.toString() === comercianteId
    );

    if (!esComercianteDeLaOrden) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No tienes permiso para actualizar esta orden'
      });
    }

    // Validar estados permitidos
    const estadosPermitidos = ['pendiente', 'confirmado', 'procesando', 'enviado', 'entregado', 'cancelado'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Estado no válido'
      });
    }

    // Actualizar el estado
    orden.estado = estado;
    orden.fechaActualizacion = new Date();

    // Agregar al historial
    orden.historialEstados.push({
      estado: estado,
      fecha: new Date(),
      comentario: `Estado actualizado por comerciante`,
      usuario: comercianteId
    });

    // Si se proporciona información de seguimiento
    if (numeroSeguimiento && transportadora) {
      if (!orden.seguimiento) {
        orden.seguimiento = {};
      }
      orden.seguimiento.numeroSeguimiento = numeroSeguimiento;
      orden.seguimiento.transportadora = transportadora;
      orden.seguimiento.fechaEnvio = new Date();
    }

    await orden.save();

    console.log(`✅ Orden ${orden.numeroOrden} actualizada a estado: ${estado}`);

    res.json({
      exito: true,
      mensaje: 'Estado de la orden actualizado exitosamente',
      datos: orden
    });

  } catch (error) {
    console.error('Error actualizando estado de orden:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      errores: [error.message]
    });
  }
};

// @desc    Obtener detalle de orden
// @route   GET /api/orders/:id/detail
// @access  Private
const obtenerDetalleOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;
    const rolUsuario = req.usuario.rol;

    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(id)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de orden inválido'
      });
    }

    const orden = await Order.findById(id)
      .populate('cliente', 'nombre email telefono')
      .populate('productos.producto', 'nombre imagenes comerciante')
      .populate('productos.comerciante', 'nombre');

    if (!orden) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Orden no encontrada'
      });
    }

    // Verificar permisos
    let tienePermiso = false;
    
    if (rolUsuario === 'administrador') {
      tienePermiso = true;
    } else if (rolUsuario === 'cliente') {
      tienePermiso = orden.cliente._id.toString() === usuarioId;
    } else if (rolUsuario === 'comerciante') {
      tienePermiso = orden.productos.some(item => 
        item.comerciante._id.toString() === usuarioId
      );
    }

    if (!tienePermiso) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No tienes permiso para ver esta orden'
      });
    }

    res.json({
      exito: true,
      mensaje: 'Detalle de orden obtenido exitosamente',
      datos: orden
    });

  } catch (error) {
    console.error('Error obteniendo detalle de orden:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      errores: [error.message]
    });
  }
};

// @desc    Obtener pedido por ID
// @route   GET /api/orders/:id
// @access  Private
const obtenerPedidoPorId = async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(req.params.id)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de pedido inválido'
      });
    }

    const pedido = await Order.findById(req.params.id)
      .populate('cliente', 'nombre email telefono')
      .populate('productos.producto', 'nombre imagenes comerciante')
      .populate('direccionEntrega');

    if (!pedido) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Pedido no encontrado'
      });
    }

    // Verificar permisos
    let tienePermiso = false;
    
    if (req.usuario.rol === 'administrador') {
      tienePermiso = true;
    } else if (req.usuario.rol === 'cliente') {
      tienePermiso = pedido.cliente._id.toString() === req.usuario.id;
    } else if (req.usuario.rol === 'comerciante') {
      // Verificar si el comerciante tiene productos en este pedido
      tienePermiso = pedido.productos.some(item => 
        item.comerciante.toString() === req.usuario.id
      );
    }

    if (!tienePermiso) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No tienes permiso para ver este pedido'
      });
    }

    res.json({
      exito: true,
      mensaje: 'Pedido obtenido exitosamente',
      datos: pedido
    });

  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de pedido inválido'
      });
    }
    res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      errores: [error.message]
    });
  }
};

// @desc    Actualizar estado del pedido
// @route   PUT /api/orders/:id/status
// @access  Private (Admin o Comerciante)
const actualizarEstadoPedido = async (req, res) => {
  try {
    const { estado, comentario } = req.body;

    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(req.params.id)) {
      return errorResponse(res, 'ID de pedido inválido', 400);
    }

    const pedido = await Order.findById(req.params.id)
      .populate('usuario', 'nombre email');

    if (!pedido) {
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    // Solo admin puede cambiar cualquier estado
    // Comerciantes solo pueden cambiar sus productos a "procesando" o "enviado"
    if (req.usuario.rol !== 'administrador') {
      // Verificar si el comerciante tiene productos en este pedido
      const tieneProductos = pedido.productos.some(item => 
        item.comerciante.toString() === req.usuario.id
      );

      if (!tieneProductos) {
        return errorResponse(res, 'No tienes permiso para actualizar este pedido', 403);
      }
    }

    // Actualizar estado
    pedido.estado = estado;
    if (comentario) {
      pedido.historialEstados.push({
        estado,
        comentario,
        fecha: new Date(),
        actualizadoPor: req.usuario.id
      });
    }

    // Actualizar fecha según el estado
    switch (estado) {
      case 'procesando':
        pedido.fechaProcesamiento = new Date();
        break;
      case 'enviado':
        pedido.fechaEnvio = new Date();
        break;
      case 'entregado':
        pedido.fechaEntrega = new Date();
        break;
      case 'cancelado':
        pedido.fechaCancelacion = new Date();
        // Devolver stock a los productos
        for (let item of pedido.productos) {
          await Product.findByIdAndUpdate(
            item.producto,
            { 
              $inc: { 
                stock: item.cantidad,
                'estadisticas.vendidos': -item.cantidad
              }
            }
          );
        }
        break;
    }

    await pedido.save();

    // Enviar notificación al usuario
    try {
      await enviarNotificacion(pedido.usuario._id, 'pedido_actualizado', {
        pedidoId: pedido._id,
        estado: estado,
        comentario: comentario
      });
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError);
    }

    successResponse(res, 'Estado del pedido actualizado exitosamente', pedido);

  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Cancelar pedido
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelarPedido = async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!validarObjectId(req.params.id)) {
      return errorResponse(res, 'ID de pedido inválido', 400);
    }

    const pedido = await Order.findById(req.params.id);

    if (!pedido) {
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    // Solo el usuario dueño del pedido puede cancelarlo
    if (pedido.usuario.toString() !== req.usuario.id) {
      return errorResponse(res, 'No tienes permiso para cancelar este pedido', 403);
    }

    // Solo se puede cancelar si está pendiente o procesando
    if (!['pendiente', 'procesando'].includes(pedido.estado)) {
      return errorResponse(res, 'No se puede cancelar un pedido en este estado', 400);
    }

    pedido.estado = 'cancelado';
    pedido.fechaCancelacion = new Date();
    pedido.historialEstados.push({
      estado: 'cancelado',
      comentario: req.body.razon || 'Cancelado por el usuario',
      fecha: new Date(),
      actualizadoPor: req.usuario.id
    });

    await pedido.save();

    // Devolver stock a los productos
    for (let item of pedido.productos) {
      await Product.findByIdAndUpdate(
        item.producto,
        { 
          $inc: { 
            stock: item.cantidad,
            'estadisticas.vendidos': -item.cantidad
          }
        }
      );
    }

    successResponse(res, 'Pedido cancelado exitosamente', pedido);

  } catch (error) {
    console.error('Error cancelando pedido:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Obtener seguimiento detallado del pedido
// @route   GET /api/orders/:id/tracking
// @access  Private
const obtenerSeguimientoPedido = async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id)
      .populate('cliente', 'nombre email telefono')
      .populate('productos.producto', 'nombre imagenes comerciante')
      .populate('historialEstados.usuario', 'nombre rol');

    if (!pedido) {
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    // Verificar permisos
    const esPropio = pedido.cliente._id.toString() === req.usuario.id;
    const esAdmin = req.usuario.rol === 'administrador';
    const esComerciante = pedido.productos.some(p => p.comerciante.toString() === req.usuario.id);

    if (!esPropio && !esAdmin && !esComerciante) {
      return errorResponse(res, 'No tienes permiso para ver este seguimiento', 403);
    }

    // Crear timeline de seguimiento
    const timeline = [
      {
        estado: 'pendiente',
        titulo: 'Pedido Creado',
        descripcion: 'Tu pedido ha sido creado y está siendo procesado',
        fecha: pedido.fechaCreacion,
        completado: true,
        icono: 'shopping-cart'
      },
      {
        estado: 'confirmado',
        titulo: 'Pago Confirmado',
        descripcion: 'El pago ha sido verificado y aprobado',
        fecha: pedido.metodoPago.fechaPago,
        completado: ['confirmado', 'procesando', 'enviado', 'entregado'].includes(pedido.estado),
        icono: 'credit-card'
      },
      {
        estado: 'procesando',
        titulo: 'Preparando Pedido',
        descripcion: 'Los productos están siendo preparados para envío',
        fecha: pedido.fechaProcesamiento,
        completado: ['procesando', 'enviado', 'entregado'].includes(pedido.estado),
        icono: 'package'
      },
      {
        estado: 'enviado',
        titulo: 'Pedido Enviado',
        descripcion: 'Tu pedido está en camino',
        fecha: pedido.envio?.fechaEnvio,
        completado: ['enviado', 'entregado'].includes(pedido.estado),
        icono: 'truck',
        detalles: pedido.envio?.numeroGuia ? {
          empresa: pedido.envio.empresa,
          numeroGuia: pedido.envio.numeroGuia,
          fechaEntregaEstimada: pedido.envio.fechaEntregaEstimada
        } : null
      },
      {
        estado: 'entregado',
        titulo: 'Pedido Entregado',
        descripcion: 'Tu pedido ha sido entregado exitosamente',
        fecha: pedido.envio?.fechaEntregaReal || pedido.fechaEntrega,
        completado: pedido.estado === 'entregado',
        icono: 'check-circle'
      }
    ];

    // Si está cancelado, agregar al timeline
    if (pedido.estado === 'cancelado') {
      timeline.push({
        estado: 'cancelado',
        titulo: 'Pedido Cancelado',
        descripcion: pedido.motivoCancelacion || 'El pedido ha sido cancelado',
        fecha: pedido.fechaCancelacion,
        completado: true,
        icono: 'x-circle',
        esCancelacion: true
      });
    }

    // Información de entrega estimada
    let tiempoEstimadoEntrega = null;
    if (pedido.estado === 'enviado' && pedido.envio?.fechaEntregaEstimada) {
      const ahora = new Date();
      const fechaEstimada = new Date(pedido.envio.fechaEntregaEstimada);
      const diasRestantes = Math.ceil((fechaEstimada - ahora) / (1000 * 60 * 60 * 24));
      
      if (diasRestantes > 0) {
        tiempoEstimadoEntrega = `${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`;
      } else {
        tiempoEstimadoEntrega = 'Entrega pendiente';
      }
    }

    successResponse(res, 'Seguimiento obtenido exitosamente', {
      pedido: {
        id: pedido._id,
        numeroOrden: pedido.numeroOrden,
        estado: pedido.estado,
        total: pedido.total,
        fechaCreacion: pedido.fechaCreacion
      },
      timeline,
      historialCompleto: pedido.historialEstados,
      informacionEnvio: pedido.envio,
      tiempoEstimadoEntrega,
      direccionEntrega: pedido.direccionEntrega
    });

  } catch (error) {
    console.error('Error obteniendo seguimiento:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Agregar comentario al pedido
// @route   POST /api/orders/:id/comments
// @access  Private
const agregarComentarioPedido = async (req, res) => {
  try {
    const { mensaje, esInterno = false } = req.body;
    
    if (!mensaje || mensaje.trim().length < 3) {
      return errorResponse(res, 'El mensaje debe tener al menos 3 caracteres', 400);
    }

    const pedido = await Order.findById(req.params.id);
    
    if (!pedido) {
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    // Verificar permisos
    const esPropio = pedido.cliente.toString() === req.usuario.id;
    const esAdmin = req.usuario.rol === 'administrador';
    const esComerciante = pedido.productos.some(p => p.comerciante.toString() === req.usuario.id);

    if (!esPropio && !esAdmin && !esComerciante) {
      return errorResponse(res, 'No tienes permiso para comentar en este pedido', 403);
    }

    // Solo admin puede hacer comentarios internos
    const comentarioInterno = esInterno && req.usuario.rol === 'administrador';

    const nuevoComentario = {
      usuario: req.usuario.id,
      mensaje: mensaje.trim(),
      esInterno: comentarioInterno,
      fecha: new Date()
    };

    pedido.comentarios.push(nuevoComentario);
    await pedido.save();

    await pedido.populate('comentarios.usuario', 'nombre rol');

    // Notificar a las partes relevantes (excepto comentarios internos)
    if (!comentarioInterno) {
      try {
        // Notificar al cliente si no es quien comentó
        if (pedido.cliente.toString() !== req.usuario.id) {
          await enviarNotificacion(pedido.cliente, 'comentario_pedido', {
            pedidoId: pedido._id,
            numeroOrden: pedido.numeroOrden,
            comentario: mensaje
          });
        }

        // Notificar a comerciantes si no fueron quienes comentaron
        const comerciantesIds = [...new Set(pedido.productos.map(p => p.comerciante.toString()))];
        for (let comercianteId of comerciantesIds) {
          if (comercianteId !== req.usuario.id) {
            await enviarNotificacion(comercianteId, 'comentario_pedido', {
              pedidoId: pedido._id,
              numeroOrden: pedido.numeroOrden,
              comentario: mensaje
            });
          }
        }
      } catch (notifError) {
        console.error('Error enviando notificaciones:', notifError);
      }
    }

    successResponse(res, 'Comentario agregado exitosamente', {
      comentario: pedido.comentarios[pedido.comentarios.length - 1]
    });

  } catch (error) {
    console.error('Error agregando comentario:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Actualizar información de envío
// @route   PUT /api/orders/:id/shipping
// @access  Private (Admin o Comerciante)
const actualizarInfoEnvio = async (req, res) => {
  try {
    const { empresa, numeroGuia, fechaEntregaEstimada, tipoEnvio } = req.body;
    
    const pedido = await Order.findById(req.params.id);
    
    if (!pedido) {
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    // Verificar permisos
    const esAdmin = req.usuario.rol === 'administrador';
    const esComerciante = pedido.productos.some(p => p.comerciante.toString() === req.usuario.id);

    if (!esAdmin && !esComerciante) {
      return errorResponse(res, 'No tienes permiso para actualizar el envío', 403);
    }

    // Actualizar información de envío
    const datosEnvio = {
      ...pedido.envio,
      empresa: empresa || pedido.envio?.empresa,
      numeroGuia: numeroGuia || pedido.envio?.numeroGuia,
      fechaEntregaEstimada: fechaEntregaEstimada || pedido.envio?.fechaEntregaEstimada,
      tipoEnvio: tipoEnvio || pedido.envio?.tipoEnvio
    };

    // Si se proporciona número de guía y el pedido no está enviado, marcarlo como enviado
    if (numeroGuia && pedido.estado === 'procesando') {
      pedido.estado = 'enviado';
      datosEnvio.fechaEnvio = new Date();
      
      pedido.historialEstados.push({
        estado: 'enviado',
        comentario: `Enviado con ${empresa || 'transportadora'} - Guía: ${numeroGuia}`,
        fecha: new Date(),
        usuario: req.usuario.id
      });
    }

    pedido.envio = datosEnvio;
    await pedido.save();

    // Notificar al cliente
    try {
      await enviarNotificacion(pedido.cliente, 'envio_actualizado', {
        pedidoId: pedido._id,
        numeroOrden: pedido.numeroOrden,
        empresa: datosEnvio.empresa,
        numeroGuia: datosEnvio.numeroGuia,
        fechaEntregaEstimada: datosEnvio.fechaEntregaEstimada
      });
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError);
    }

    successResponse(res, 'Información de envío actualizada exitosamente', {
      envio: pedido.envio,
      estado: pedido.estado
    });

  } catch (error) {
    console.error('Error actualizando información de envío:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

// @desc    Confirmar entrega del pedido
// @route   PUT /api/orders/:id/confirm-delivery
// @access  Private (Cliente)
const confirmarEntrega = async (req, res) => {
  try {
    const { confirmado, comentario, calificacionEntrega, problemas } = req.body;
    
    const pedido = await Order.findById(req.params.id)
      .populate('productos.producto', 'nombre comerciante');
    
    if (!pedido) {
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    // Solo el cliente puede confirmar la entrega
    if (pedido.cliente.toString() !== req.usuario.id) {
      return errorResponse(res, 'Solo el cliente puede confirmar la entrega', 403);
    }

    // Solo se puede confirmar si está enviado o entregado
    if (!['enviado', 'entregado'].includes(pedido.estado)) {
      return errorResponse(res, 'El pedido debe estar en estado "enviado" o "entregado" para confirmar entrega', 400);
    }

    // Verificar que no haya sido confirmado ya
    if (pedido.entrega?.confirmada) {
      return errorResponse(res, 'Este pedido ya ha sido confirmado', 400);
    }

    if (confirmado) {
      // Confirmar entrega
      pedido.estado = 'entregado';
      pedido.envio.fechaEntregaReal = pedido.envio.fechaEntregaReal || new Date();
      
      // Actualizar información de entrega
      pedido.entrega = {
        confirmada: true,
        fechaConfirmacion: new Date(),
        comentarioCliente: comentario || '',
        calificacionEntrega: calificacionEntrega || 5,
        problemas: problemas || []
      };

      // Habilitar reseñas
      pedido.reseñas = {
        puedeReseñar: true,
        fechaHabilitacion: new Date(),
        recordatorioEnviado: false
      };
      
      pedido.historialEstados.push({
        estado: 'entregado_confirmado',
        comentario: `Entrega confirmada por el cliente${comentario ? ': ' + comentario : ''}`,
        fecha: new Date(),
        usuario: req.usuario.id
      });

      await pedido.save();

      // Actualizar estadísticas de productos
      for (let item of pedido.productos) {
        await Product.findByIdAndUpdate(item.producto, {
          $inc: { 'estadisticas.vendidos': item.cantidad }
        });
      }

      // Enviar notificación al comerciante
      try {
        const comerciantesIds = [...new Set(pedido.productos.map(p => p.comerciante.toString()))];
        for (let comercianteId of comerciantesIds) {
          await enviarNotificacion({
            tipo: 'entrega_confirmada',
            destinatario: comercianteId,
            titulo: 'Entrega Confirmada',
            mensaje: `El cliente ha confirmado la entrega del pedido ${pedido.numeroOrden}`,
            datos: {
              pedidoId: pedido._id,
              numeroOrden: pedido.numeroOrden,
              calificacion: calificacionEntrega || 5
            }
          });
        }
      } catch (notifError) {
        console.warn('Error enviando notificación:', notifError);
      }

      successResponse(res, 'Entrega confirmada exitosamente. Ahora puedes dejar reseñas de los productos.', {
        estado: pedido.estado,
        fechaEntrega: pedido.envio.fechaEntregaReal,
        puedeReseñar: true,
        entregaConfirmada: true
      });
    } else {
      // Si no confirma, puede reportar un problema
      pedido.entrega = {
        confirmada: false,
        fechaConfirmacion: new Date(),
        comentarioCliente: comentario || 'Problema con la entrega',
        problemas: problemas || [{ tipo: 'otro', descripcion: comentario }]
      };

      pedido.comentarios.push({
        usuario: req.usuario.id,
        mensaje: `Problema con la entrega: ${comentario || 'Sin especificar'}`,
        fecha: new Date(),
        esInterno: false
      });

      await pedido.save();

      successResponse(res, 'Problema reportado, nos pondremos en contacto contigo', {
        problemaReportado: true,
        entregaConfirmada: false
      });
    }

  } catch (error) {
    console.error('Error confirmando entrega:', error);
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

module.exports = {
  crearPedido,
  obtenerMisPedidos,
  obtenerPedidoPorId,
  actualizarEstadoPedido,
  obtenerPedidosComerciante: obtenerOrdenesComerciante,
  cancelarPedido,
  obtenerSeguimientoPedido,
  agregarComentarioPedido,
  actualizarInfoEnvio,
  confirmarEntrega,
  obtenerOrdenesComerciante,
  actualizarEstadoOrden,
  obtenerDetalleOrden
}; 