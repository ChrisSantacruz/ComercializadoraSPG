const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');

// RUTAS ESPECÍFICAS PRIMERO (antes de las rutas con parámetros)

// @route   GET /api/orders/:id/payment-status
// @desc    Verificar estado de pago (público, para retorno de pasarela)
// @access  Public
router.get('/:id/payment-status', orderController.verificarEstadoPago);

// @route   GET /api/orders/my-orders
// @desc    Get user's own orders
// @access  Private
router.get('/my-orders', protect, orderController.obtenerMisPedidos);

// @route   GET /api/orders/merchant
// @desc    Get merchant orders (old route)
// @access  Private (Merchant only)
router.get('/merchant', protect, authorize('comerciante'), orderController.obtenerPedidosComerciante);

// @route   GET /api/orders/merchant-orders
// @desc    Get merchant orders with new filtering
// @access  Private (Merchant only)
router.get('/merchant-orders', protect, authorize('comerciante'), orderController.obtenerOrdenesComerciante);

// @route   GET /api/orders
// @desc    Get user orders (general route)
// @access  Private
router.get('/', protect, orderController.obtenerMisPedidos);

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, orderController.crearPedido);

// RUTAS CON PARÁMETROS AL FINAL

// @route   GET /api/orders/:id/detail
// @desc    Get order detail (for clients and merchants)
// @access  Private
router.get('/:id/detail', protect, orderController.obtenerDetalleOrden);

// @route   GET /api/orders/:id/tracking
// @desc    Get order tracking info
// @access  Private
router.get('/:id/tracking', protect, orderController.obtenerSeguimientoPedido);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, orderController.obtenerPedidoPorId);

// @route   PUT /api/orders/:id/status
// @desc    Update order status (old route)
// @access  Private (Merchant/Admin only)
router.put('/:id/status', protect, authorize('comerciante', 'administrador'), orderController.actualizarEstadoPedido);

// @route   PUT /api/orders/:id/update-status
// @desc    Update order status with tracking info
// @access  Private (Merchant only)
router.put('/:id/update-status', protect, authorize('comerciante'), orderController.actualizarEstadoOrden);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', protect, orderController.cancelarPedido);

// @route   PUT /api/orders/:id/shipping
// @desc    Update shipping information
// @access  Private (Merchant/Admin only)
router.put('/:id/shipping', protect, authorize('comerciante', 'administrador'), orderController.actualizarInfoEnvio);

// @route   PUT /api/orders/:id/confirm-delivery
// @desc    Confirm delivery (by customer)
// @access  Private
router.put('/:id/confirm-delivery', protect, orderController.confirmarEntrega);

// @route   POST /api/orders/:id/comment
// @desc    Add comment to order
// @access  Private
router.post('/:id/comment', protect, orderController.agregarComentarioPedido);

module.exports = router; 