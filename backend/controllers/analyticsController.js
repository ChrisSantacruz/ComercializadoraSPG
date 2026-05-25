const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Obtener analytics completos del comerciante
// @route   GET /api/analytics/merchant
// @access  Private (Comerciante)
const obtenerAnalyticsComerciante = async (req, res) => {
  try {
    const comercianteId = req.usuario.id;
    const { periodo = '30d' } = req.query;

    // Calcular fechas según el período
    const hoy = new Date();
    let fechaInicio;
    switch (periodo) {
      case '7d':
        fechaInicio = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        fechaInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        fechaInicio = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        fechaInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const inicioDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

    // Obtener productos del comerciante
    const productos = await Product.find({ comerciante: comercianteId });
    const productosIds = productos.map(p => p._id);

    // Obtener pedidos del comerciante
    const pedidos = await Order.find({
      'productos.comerciante': comercianteId
    }).populate('cliente', 'nombre email');

    // === CÁLCULOS DE VENTAS ===
    const totalIngresos = pedidos.reduce((sum, order) => {
      const productosComerciante = order.productos.filter(p => 
        p.comerciante.toString() === comercianteId.toString()
      );
      return sum + productosComerciante.reduce((sumP, p) => sumP + p.subtotal, 0);
    }, 0);

    const pedidosDelMes = pedidos.filter(order => 
      new Date(order.fechaCreacion) >= inicioDelMes
    );

    const ingresosDelMes = pedidosDelMes.reduce((sum, order) => {
      const productosComerciante = order.productos.filter(p => 
        p.comerciante.toString() === comercianteId.toString()
      );
      return sum + productosComerciante.reduce((sumP, p) => sumP + p.subtotal, 0);
    }, 0);

    const pedidosMesAnterior = pedidos.filter(order => 
      new Date(order.fechaCreacion) >= mesAnterior && 
      new Date(order.fechaCreacion) < inicioDelMes
    );

    const ingresosMesAnterior = pedidosMesAnterior.reduce((sum, order) => {
      const productosComerciante = order.productos.filter(p => 
        p.comerciante.toString() === comercianteId.toString()
      );
      return sum + productosComerciante.reduce((sumP, p) => sumP + p.subtotal, 0);
    }, 0);

    const porcentajeCambio = ingresosMesAnterior > 0 
      ? ((ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 
      : 0;

    // === CÁLCULOS DE PEDIDOS ===
    const pedidosEnTransito = pedidos.filter(order => 
      ['pendiente', 'confirmado', 'enviado'].includes(order.estado)
    ).length;

    const pedidosEntregados = pedidos.filter(order => 
      order.estado === 'entregado'
    ).length;

    const tasaConfirmacion = pedidosEntregados > 0 
      ? (pedidosEntregados / pedidos.length) * 100 
      : 0;

    // === CÁLCULOS DE PRODUCTOS ===
    const productosAgotados = productos.filter(p => p.stock === 0).length;
    const productosActivos = productos.filter(p => p.estado === 'aprobado' && p.stock > 0).length;

    // === CÁLCULOS DE CLIENTES ===
    const clientesUnicos = new Set(
      pedidosDelMes.map(order => order.cliente._id.toString())
    ).size;

    // === CÁLCULOS DE RESEÑAS ===
    const reseñas = await Review.find({
      producto: { $in: productosIds },
      estado: 'aprobada'
    }).populate('usuario', 'nombre');

    const totalReseñas = reseñas.length;
    const calificacionPromedio = totalReseñas > 0 
      ? reseñas.reduce((sum, r) => sum + r.calificacion, 0) / totalReseñas 
      : 0;

    // Distribución de calificaciones
    const distribucionCalificaciones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reseñas.forEach(r => {
      distribucionCalificaciones[r.calificacion]++;
    });

    // === VENTAS POR DÍA (últimos 7 días) ===
    const ventasPorDia = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      const pedidosDelDia = pedidos.filter(order => {
        const fechaOrden = new Date(order.fechaCreacion).toISOString().split('T')[0];
        return fechaOrden === fechaStr;
      });

      const ingresosDelDia = pedidosDelDia.reduce((sum, order) => {
        const productosComerciante = order.productos.filter(p => 
          p.comerciante.toString() === comercianteId.toString()
        );
        return sum + productosComerciante.reduce((sumP, p) => sumP + p.subtotal, 0);
      }, 0);

      ventasPorDia.push({
        fecha: fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
        ventas: pedidosDelDia.length,
        ingresos: ingresosDelDia
      });
    }

    // === PRODUCTOS MÁS VENDIDOS ===
    const productosVendidos = {};
    pedidos.forEach(order => {
      order.productos.forEach(item => {
        if (item.comerciante.toString() === comercianteId.toString()) {
          const productId = item.producto.toString();
          if (!productosVendidos[productId]) {
            productosVendidos[productId] = {
              producto: productos.find(p => p._id.toString() === productId),
              cantidadVendida: 0,
              ingresosTotales: 0
            };
          }
          productosVendidos[productId].cantidadVendida += item.cantidad;
          productosVendidos[productId].ingresosTotales += item.subtotal;
        }
      });
    });

    const productosMasVendidos = Object.values(productosVendidos)
      .filter(p => p.producto)
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 10);

    // === PEDIDOS POR ESTADO ===
    const pedidosPorEstado = {};
    pedidos.forEach(order => {
      const estado = order.estado || 'pendiente';
      pedidosPorEstado[estado] = (pedidosPorEstado[estado] || 0) + 1;
    });

    const pedidosPorEstadoArray = Object.entries(pedidosPorEstado).map(([estado, cantidad]) => ({
      estado: estado.charAt(0).toUpperCase() + estado.slice(1),
      cantidad
    }));

    // === RESEÑAS RECIENTES ===
    const reseñasRecientes = reseñas
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      .slice(0, 5)
      .map(r => ({
        _id: r._id,
        calificacion: r.calificacion,
        comentario: r.comentario,
        fechaCreacion: r.fechaCreacion,
        usuario: r.usuario?.nombre || 'Usuario anónimo',
        producto: productos.find(p => p._id.toString() === r.producto.toString())?.nombre || 'Producto eliminado'
      }));

    const analyticsData = {
      // Ventas
      totalIngresos,
      ingresosDelMes,
      ingresosMesAnterior,
      porcentajeCambio,
      ventasDelMes: pedidosDelMes.length,
      ventasTotales: pedidos.length,

      // Productos
      totalProductos: productos.length,
      productosActivos,
      productosAgotados,
      productosMasVendidos,

      // Pedidos
      pedidosTotales: pedidos.length,
      pedidosDelMes: pedidosDelMes.length,
      pedidosEnTransito,
      pedidosEntregados,
      tasaConfirmacion,

      // Clientes
      clientesUnicos,

      // Reseñas
      totalReseñas,
      calificacionPromedio,
      distribucionCalificaciones,
      reseñasRecientes,

      // Tendencias
      ventasPorDia,
      pedidosPorEstado: pedidosPorEstadoArray
    };

    logger.debug('merchant_analytics_ready', {
      requestId: req.requestId,
      comercianteId,
      periodo,
    });
    
    successResponse(res, 'Analytics obtenidos exitosamente', analyticsData);

  } catch (error) {
    logger.error('merchant_analytics_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
};

module.exports = {
  obtenerAnalyticsComerciante
}; 