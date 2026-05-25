const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/auth');
const { subirImagenesProducto } = require('../middlewares/upload');

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', productController.obtenerProductos);

// @route   GET /api/products/mis-productos
// @desc    Get merchant's products
// @access  Private (Merchant only)
router.get('/mis-productos', protect, authorize('comerciante'), productController.obtenerMisProductos);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', productController.getProductById);

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Merchant only)
router.post('/', protect, authorize('comerciante'), subirImagenesProducto, productController.crearProducto);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Product owner only)
router.put('/:id', protect, authorize('comerciante'), subirImagenesProducto, productController.actualizarProducto);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Product owner only)
router.delete('/:id', protect, authorize('comerciante'), productController.eliminarProducto);

// @route   POST /api/products/:id/imagenes
// @desc    Upload product images
// @access  Private (Product owner only)
router.post('/:id/imagenes', protect, authorize('comerciante'), subirImagenesProducto, productController.subirImagenes);

module.exports = router; 