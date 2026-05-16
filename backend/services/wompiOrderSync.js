const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { sendOrderConfirmationEmail } = require('../utils/email');
const wompiService = require('./wompiService');

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

/**
 * Sincroniza una orden con el objeto transaction devuelto por GET /v1/transactions/:id (fuente de verdad).
 * Idempotente para APPROVED (no doble descuento de stock).
 */
async function syncOrderWithTransaction(transaction) {
  if (!transaction || !transaction.reference) {
    return { ok: false, reason: 'missing_reference' };
  }

  const order = await Order.findById(transaction.reference);
  if (!order) {
    return { ok: false, reason: 'order_not_found' };
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

  const status = (transaction.status || '').toUpperCase();

  switch (status) {
    case 'APPROVED': {
      const already = order.paymentInfo.paymentStatus === 'approved' ||
        order.estado === 'confirmado';
      if (already) {
        await order.save();
        return { ok: true, idempotent: true, orderId: String(order._id) };
      }

      order.metodoPago = order.metodoPago || { tipo: 'wompi' };
      order.estado = 'confirmado';
      order.metodoPago.estado = 'aprobado';
      order.metodoPago.transaccionId = transaction.id;
      order.metodoPago.fechaPago = new Date();
      order.paymentInfo.paymentStatus = 'approved';
      order.paymentInfo.paidAt = new Date();

      for (const item of order.productos) {
        try {
          const updated = await Product.findOneAndUpdate(
            { _id: item.producto, stock: { $gte: item.cantidad } },
            {
              $inc: {
                stock: -item.cantidad,
                'estadisticas.cantidadVendida': item.cantidad
              }
            },
            { new: true }
          );
          if (!updated) {
            // eslint-disable-next-line no-console
            console.error(`wompiOrderSync: stock insuficiente o producto ausente ${item.producto}`);
          }
        } catch (stockError) {
          // eslint-disable-next-line no-console
          console.error(`wompiOrderSync: error actualizando stock ${item.producto}`, stockError);
        }
      }

      try {
        await Notification.create({
          usuario: order.cliente,
          tipo: 'pedido_confirmado',
          titulo: 'Pago exitoso',
          mensaje: `Tu pago por $${order.total.toLocaleString('es-CO')} COP ha sido procesado exitosamente`,
          datos: {
            elementoId: order._id,
            tipoElemento: 'pedido',
            url: `/orders/${order._id}`
          },
          prioridad: 'alta'
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('wompiOrderSync: notificación pago', e);
      }

      try {
        const orderWithDetails = await Order.findById(order._id)
          .populate('cliente', 'nombre email')
          .populate('productos.producto', 'nombre imagenPrincipal');
        if (orderWithDetails?.cliente?.email) {
          await sendOrderConfirmationEmail(orderWithDetails);
        }
      } catch (emailError) {
        // eslint-disable-next-line no-console
        console.error('wompiOrderSync: email confirmación', emailError);
      }
      break;
    }
    case 'DECLINED': {
      order.estado = 'payment_failed';
      order.paymentInfo.paymentStatus = 'declined';
      order.paymentInfo.failureReason = transaction.status_message || 'DECLINED';
      order.metodoPago = order.metodoPago || {};
      order.metodoPago.estado = 'rechazado';

      try {
        await Notification.create({
          usuario: order.cliente,
          tipo: 'sistema',
          titulo: 'Pago rechazado',
          mensaje: `Tu pago ha sido rechazado. Motivo: ${transaction.status_message || 'DECLINED'}`,
          datos: {
            elementoId: order._id,
            tipoElemento: 'pedido',
            url: `/orders/${order._id}`
          },
          prioridad: 'media'
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('wompiOrderSync: notificación rechazo', e);
      }
      break;
    }
    case 'PENDING': {
      order.estado = 'payment_pending';
      order.paymentInfo.paymentStatus = 'pending';
      order.metodoPago = order.metodoPago || { tipo: 'wompi' };
      break;
    }
    case 'VOIDED':
    case 'ERROR': {
      order.estado = 'payment_failed';
      order.paymentInfo.paymentStatus = 'error';
      order.paymentInfo.failureReason = transaction.status_message || status;
      order.metodoPago = order.metodoPago || {};
      order.metodoPago.estado = 'rechazado';
      break;
    }
    default:
      return { ok: false, reason: 'unknown_status', status };
  }

  await order.save();
  return { ok: true, orderId: String(order._id), status };
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
  if (!tx || !tx.reference) {
    return { ok: false, reason: 'invalid_remote_payload' };
  }
  return syncOrderWithTransaction(tx);
}

module.exports = {
  extractTransactionFromWebhookEvent,
  extractTransactionIdFromWebhookEvent,
  syncOrderWithTransaction,
  reconcileTransactionById,
  expectedAmountInCents
};
