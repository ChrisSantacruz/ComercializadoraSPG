const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Cart = require('../models/Cart');
const wompiService = require('./wompiService');
const { sendApprovedOrderEmails } = require('./transactionalEmailService');
const logger = require('../utils/logger');

const WOMPI_STATUSES = Object.freeze({
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  VOIDED: 'VOIDED',
  ERROR: 'ERROR',
  EXPIRED: 'EXPIRED'
});

const TERMINAL_FAILED = new Set([
  WOMPI_STATUSES.DECLINED,
  WOMPI_STATUSES.VOIDED,
  WOMPI_STATUSES.ERROR,
  WOMPI_STATUSES.EXPIRED
]);

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 * Extrae el objeto transaction del payload de evento Wompi (varía por tipo de evento).
 */
function extractTransactionFromWebhookEvent(eventData) {
  const d = eventData?.data;
  if (!d) return null;
  if (d.transaction && typeof d.transaction === 'object') return d.transaction;
  return null;
}

function extractTransactionIdFromWebhookEvent(eventData) {
  const tx = extractTransactionFromWebhookEvent(eventData);
  if (tx?.id) return tx.id;
  const id = getNested(eventData, 'data.id');
  return id || null;
}

function expectedAmountInCents(order) {
  return Math.round(Number(order.total) * 100);
}

function isMongoObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ''));
}

/**
 * En payment links Wompi genera su propia `reference` (ej. zWEAR9_1779...), no el ObjectId del pedido.
 * La vinculación correcta es `payment_link_id` + monto, o `reference` cuando coincide con el pedido.
 */
function transactionBelongsToOrder(order, transaction) {
  if (!order || !transaction) return false;

  const orderId = String(order._id);
  const txRef = transaction.reference != null ? String(transaction.reference) : '';

  if (txRef === orderId) return true;

  const linkId = transaction.payment_link_id;
  const orderLinkId = order.paymentInfo?.paymentLinkId;
  if (linkId && orderLinkId && String(linkId) === String(orderLinkId)) {
    return true;
  }

  if (
    order.paymentInfo?.transactionId &&
    transaction.id &&
    String(order.paymentInfo.transactionId) === String(transaction.id)
  ) {
    return true;
  }

  return false;
}

async function resolveOrderFromTransaction(transaction, hintOrderId = null) {
  if (!transaction) return null;

  if (hintOrderId) {
    const hinted = await Order.findById(hintOrderId);
    if (hinted && transactionBelongsToOrder(hinted, transaction)) {
      return hinted;
    }
  }

  const ref = transaction.reference;
  if (ref && isMongoObjectId(ref)) {
    const byRef = await Order.findById(ref);
    if (byRef) return byRef;
  }

  const linkId = transaction.payment_link_id;
  if (linkId) {
    const byLink = await Order.findOne({ 'paymentInfo.paymentLinkId': String(linkId) });
    if (byLink) return byLink;
  }

  return null;
}

function normalizeWompiStatus(status) {
  const normalized = String(status || '').toUpperCase();
  return WOMPI_STATUSES[normalized] || null;
}

function toPaymentStatus(status) {
  const map = {
    CREATED: 'created',
    PENDING: 'pending',
    APPROVED: 'approved',
    DECLINED: 'declined',
    VOIDED: 'voided',
    ERROR: 'error',
    EXPIRED: 'expired'
  };
  return map[status] || 'error';
}

async function notifyBuyerPaymentApproved(order) {
  try {
    await Notification.create({
      usuario: order.cliente,
      tipo: 'pedido_confirmado',
      titulo: 'Pago confirmado',
      mensaje: `Tu pago por $${order.total.toLocaleString('es-CO')} COP fue confirmado`,
      datos: {
        elementoId: order._id,
        tipoElemento: 'pedido',
        url: `/orders/${order._id}`
      },
      prioridad: 'alta'
    });
  } catch (error) {
    logger.warn('payment_approved_notification_failed', { orderId: order._id, message: error.message });
  }
}

async function notifyMerchantsAndStats(order) {
  const merchantIds = [...new Set(order.productos.map((item) => String(item.comerciante)))];

  for (const merchantId of merchantIds) {
    const products = order.productos.filter((item) => String(item.comerciante) === merchantId);
    const totalVenta = products.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    try {
      await User.findByIdAndUpdate(merchantId, {
        $inc: {
          'estadisticas.productosVendidos': products.length,
          'estadisticas.ingresosTotales': totalVenta,
          'estadisticas.pedidosRealizados': 1
        }
      });

      await Notification.create({
        usuario: merchantId,
        tipo: 'nueva_venta',
        titulo: 'Nueva venta confirmada',
        mensaje: `Venta confirmada por $${totalVenta.toLocaleString('es-CO')} COP`,
        datos: {
          elementoId: order._id,
          tipoElemento: 'pedido',
          url: `/merchant/orders/${order._id}`,
          accion: 'ver_pedido',
          datosExtra: {
            numeroOrden: order.numeroOrden,
            cantidadProductos: products.length,
            total: totalVenta
          }
        },
        prioridad: 'alta',
        canales: {
          enApp: true,
          email: true
        }
      });
    } catch (error) {
      logger.warn('merchant_sale_notification_failed', { orderId: order._id, merchantId, message: error.message });
    }
  }
}

async function clearBuyerCart(order) {
  await Cart.findOneAndUpdate(
    { usuario: order.cliente },
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
}

async function discountStockOnce(order) {
  if (order.paymentInfo?.stockDiscountedAt) {
    return { discounted: false, idempotent: true };
  }

  for (const item of order.productos) {
    const query = item.variantId
      ? {
          _id: item.producto,
          'variants._id': item.variantId,
          'variants.stock': { $gte: item.cantidad },
          'variants.activo': { $ne: false }
        }
      : { _id: item.producto, stock: { $gte: item.cantidad } };

    const update = item.variantId
      ? {
          $inc: {
            stock: -item.cantidad,
            'variants.$.stock': -item.cantidad,
            'estadisticas.cantidadVendida': item.cantidad
          }
        }
      : {
          $inc: {
            stock: -item.cantidad,
            'estadisticas.cantidadVendida': item.cantidad
          }
        };

    const updated = await Product.findOneAndUpdate(query, update, { new: true });
    if (!updated) {
      logger.error('order_confirm_stock_failed', {
        orderId: order._id,
        productId: item.producto,
        variantId: item.variantId,
        quantity: item.cantidad
      });
      throw new Error(`stock_unavailable:${item.producto}`);
    }
  }

  order.paymentInfo.stockDiscountedAt = new Date();
  await order.save();
  logger.info('order_stock_discounted', { orderId: order._id });
  return { discounted: true };
}

/**
 * Sincroniza una orden con el objeto transaction devuelto por GET /v1/transactions/:id (fuente de verdad).
 * Idempotente para APPROVED (no doble descuento de stock).
 */
async function syncOrderWithTransaction(transaction, options = {}) {
  if (!transaction?.id) {
    return { ok: false, reason: 'missing_transaction' };
  }

  const order = options.order || await resolveOrderFromTransaction(transaction, options.hintOrderId);
  if (!order) {
    return {
      ok: false,
      reason: 'order_not_found',
      txReference: transaction.reference,
      paymentLinkId: transaction.payment_link_id
    };
  }

  const expected = expectedAmountInCents(order);
  const amount = Number(transaction.amount_in_cents);
  if (Number.isFinite(amount) && Number.isFinite(expected) && amount !== expected) {
    return {
      ok: false,
      reason: 'amount_mismatch',
      orderId: String(order._id),
      expected,
      received: amount
    };
  }

  if (!order.paymentInfo) {
    order.paymentInfo = { method: 'wompi' };
  }
  order.paymentInfo.transactionId = transaction.id;
  order.paymentInfo.method = order.paymentInfo.method || 'wompi';
  order.paymentInfo.lastVerifiedAt = new Date();

  const status = normalizeWompiStatus(transaction.status);
  if (!status) {
    return { ok: false, reason: 'unknown_status', status: transaction.status };
  }

  order.paymentInfo.wompiStatus = status;
  order.paymentInfo.paymentStatus = toPaymentStatus(status);
  order.metodoPago = order.metodoPago || { tipo: 'wompi' };
  order.metodoPago.transaccionId = transaction.id;

  logger.info('payment_verified', {
    orderId: order._id,
    transactionId: transaction.id,
    status,
    amountInCents: amount
  });

  if (status === WOMPI_STATUSES.APPROVED) {
    const alreadyApproved = order.estado === 'confirmado' && order.paymentInfo.paymentStatus === 'approved';

    order.estado = 'confirmado';
    order.metodoPago.estado = 'aprobado';
    order.metodoPago.fechaPago = order.metodoPago.fechaPago || new Date();
    order.paymentInfo.paidAt = order.paymentInfo.paidAt || new Date();
    order.paymentInfo.failureReason = undefined;
    await order.save();

    if (alreadyApproved && order.paymentInfo.stockDiscountedAt && order.paymentInfo.buyerEmailSentAt && order.paymentInfo.merchantEmailSentAt) {
      return { ok: true, idempotent: true, orderId: String(order._id), status };
    }

    const claimed = await Order.findOneAndUpdate(
      {
        _id: order._id,
        'paymentInfo.stockDiscountedAt': { $exists: false },
        'paymentInfo.syncLockAt': { $exists: false }
      },
      { $set: { 'paymentInfo.syncLockAt': new Date() } },
      { new: true }
    );

    if (!claimed && !order.paymentInfo.stockDiscountedAt) {
      logger.info('order_confirm_already_processing', { orderId: order._id, transactionId: transaction.id });
      return { ok: true, processing: true, orderId: String(order._id), status };
    }

    const activeOrder = claimed || order;
    const stock = claimed ? await discountStockOnce(activeOrder) : { idempotent: true };
    if (claimed && !activeOrder.paymentInfo.notificationsSentAt) {
      await notifyBuyerPaymentApproved(activeOrder);
      await notifyMerchantsAndStats(activeOrder);
      await clearBuyerCart(activeOrder);
      activeOrder.paymentInfo.notificationsSentAt = new Date();
      await activeOrder.save();
    }

    const orderWithDetails = await Order.findById(activeOrder._id)
      .populate('cliente', 'nombre email')
      .populate('productos.producto', 'nombre imagenPrincipal')
      .populate('productos.comerciante', 'nombre email');

    if (claimed && orderWithDetails && (!activeOrder.paymentInfo.buyerEmailSentAt || !activeOrder.paymentInfo.merchantEmailSentAt)) {
      const emailResult = await sendApprovedOrderEmails(orderWithDetails);
      activeOrder.paymentInfo.emailAttempts = Number(activeOrder.paymentInfo.emailAttempts || 0) + 1;
      if (emailResult.buyer?.ok || emailResult.buyer?.skipped) {
        activeOrder.paymentInfo.buyerEmailSentAt = activeOrder.paymentInfo.buyerEmailSentAt || new Date();
      }
      if (emailResult.merchants?.every((result) => result.ok || result.skipped)) {
        activeOrder.paymentInfo.merchantEmailSentAt = activeOrder.paymentInfo.merchantEmailSentAt || new Date();
      }
      await activeOrder.save();
    }

    logger.info('order_confirmed', { orderId: activeOrder._id, transactionId: transaction.id, stock });
    return { ok: true, orderId: String(activeOrder._id), status };
  }

  if (status === WOMPI_STATUSES.PENDING || status === WOMPI_STATUSES.CREATED) {
    order.estado = 'payment_pending';
    order.metodoPago.estado = 'procesando';
    await order.save();
    return { ok: true, orderId: String(order._id), status };
  }

  if (TERMINAL_FAILED.has(status)) {
    order.estado = 'payment_failed';
    order.paymentInfo.failureReason = transaction.status_message || status;
    order.metodoPago.estado = 'rechazado';
    await order.save();
    logger.info('payment_rejected', { orderId: order._id, transactionId: transaction.id, status });
    return { ok: true, orderId: String(order._id), status };
  }

  return { ok: false, reason: 'unknown_status', status };
}

/**
 * Webhook / reconciliación: obtiene la transacción remota y aplica a la orden.
 */
async function reconcileTransactionById(transactionId) {
  const remote = await wompiService.getTransactionStatus(transactionId);
  if (!remote.success) {
    return { ok: false, reason: 'remote_fetch_failed', error: remote.error };
  }
  const tx = remote.data?.data || remote.data?.datos || remote.data;
  if (!tx?.id) {
    return { ok: false, reason: 'invalid_remote_payload' };
  }
  return syncOrderWithTransaction(tx);
}

module.exports = {
  extractTransactionFromWebhookEvent,
  extractTransactionIdFromWebhookEvent,
  syncOrderWithTransaction,
  reconcileTransactionById,
  expectedAmountInCents,
  normalizeWompiStatus,
  transactionBelongsToOrder,
  resolveOrderFromTransaction,
  WOMPI_STATUSES
};
