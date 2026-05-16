const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middlewares/auth');
const { validarAgregarCarrito, validarActualizarCantidad } = require('../middlewares/validation');

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get('/', protect, cartController.obtenerCarrito);

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', protect, validarAgregarCarrito, cartController.agregarAlCarrito);

// @route   PUT /api/cart/update
// @desc    Update cart item quantity
// @access  Private
router.put('/update', protect, validarActualizarCantidad, cartController.actualizarCantidad);

// @route   PUT /api/cart/update/:productId
// @desc    Update cart item quantity
// @access  Private
router.put('/update/:productId', protect, validarActualizarCantidad, cartController.actualizarCantidad);

// @route   DELETE /api/cart/remove/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/remove/:productId', protect, cartController.eliminarDelCarrito);

// @route   DELETE /api/cart/clear
// @desc    Clear cart
// @access  Private
router.delete('/clear', protect, cartController.limpiarCarrito);

// @route   PUT /api/cart/delivery-type
// @desc    Update cart delivery type
// @access  Private
router.put('/delivery-type', protect, cartController.actualizarTipoEntrega);

// @route   POST /api/cart/coupon
// @desc    Apply coupon to cart
// @access  Private
router.post('/coupon', protect, cartController.aplicarCupon);

// @route   DELETE /api/cart/coupon/:codigo
// @desc    Remove coupon from cart
// @access  Private
router.delete('/coupon/:codigo', protect, cartController.removerCupon);

// @route   GET /api/cart/available-coupons
// @desc    Get available coupons for user
// @access  Private
router.get('/available-coupons', protect, cartController.obtenerCuponesDisponibles);

// @route   POST /api/cart/recalculate
// @desc    Recalculate cart totals
// @access  Private
router.post('/recalculate', protect, cartController.recalcularCarrito);

module.exports = router; 