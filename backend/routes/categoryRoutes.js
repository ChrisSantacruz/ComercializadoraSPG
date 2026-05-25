const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, authorize } = require('../middlewares/auth');
const { subirImagenCategoria } = require('../middlewares/upload');

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', categoryController.obtenerCategorias);

// @route   GET /api/categories/active
// @desc    Get active categories only
// @access  Public
router.get('/active', categoryController.obtenerCategoriasActivas);

// @route   GET /api/categories/tree
// @desc    Get category tree (with subcategories)
// @access  Public
router.get('/tree', categoryController.obtenerArbolCategorias);

// @route   GET /api/categories/pending
// @desc    Get pending categories
// @access  Private (Admin only)
router.get('/pending', protect, authorize('administrador'), categoryController.obtenerCategoriasPendientes);

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', categoryController.obtenerCategoriaPorId);

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin only)
router.post('/', protect, authorize('administrador'), subirImagenCategoria, categoryController.crearCategoria);

// @route   PUT /api/categories/:id/approve
// @desc    Approve/reject category
// @access  Private (Admin only)
router.put('/:id/approve', protect, authorize('administrador'), categoryController.aprobarCategoria);

// @route   PUT /api/categories/reorder
// @desc    Reorder categories
// @access  Private (Admin only)
router.put('/reorder', protect, authorize('administrador'), categoryController.reordenarCategorias);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin only)
router.put('/:id', protect, authorize('administrador'), subirImagenCategoria, categoryController.actualizarCategoria);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('administrador'), categoryController.eliminarCategoria);

module.exports = router; 