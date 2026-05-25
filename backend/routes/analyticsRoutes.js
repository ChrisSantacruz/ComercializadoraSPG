const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { obtenerAnalyticsComerciante } = require('../controllers/analyticsController');

// Todas las rutas requieren autenticación
router.use(protect);

// Obtener analytics del comerciante
router.get('/merchant', obtenerAnalyticsComerciante);

module.exports = router; 