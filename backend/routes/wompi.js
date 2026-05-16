const express = require('express');
const router = express.Router();
const wompiController = require('../controllers/wompiController');
const { verificarToken } = require('../middlewares/auth');

// Rutas protegidas (requieren autenticación)
router.post('/payment-link', verificarToken, wompiController.createPaymentLink);
router.post('/confirm-return', verificarToken, wompiController.confirmPaymentReturn);
router.get('/transaction/:transactionId', verificarToken, wompiController.getTransactionStatus);
router.get('/acceptance-token', verificarToken, wompiController.getAcceptanceToken);
router.post('/tokenize-card', verificarToken, wompiController.tokenizeCard);
router.post('/card-transaction', verificarToken, wompiController.createCardTransaction);
router.get('/payment-methods', verificarToken, wompiController.getPaymentMethods);

// Solo desarrollo: sin auth (no exponer en producción)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-payment-link', wompiController.createPaymentLink);
}

// Webhook (no requiere autenticación, validación por firma)
// Nota: Para webhooks, es importante que el middleware de raw body vaya antes del parsing JSON
router.post('/webhook', express.raw({ type: 'application/json' }), wompiController.webhook);

module.exports = router;
