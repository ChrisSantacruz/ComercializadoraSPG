const User = require('../models/User');
const logger = require('../utils/logger');
const { sendTransactionalEmail } = require('./emailService');
const { BRAND } = require('../config/branding');

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')} COP`;
}

function renderItems(order, merchantId) {
  const items = merchantId
    ? order.productos.filter((item) => String(item.comerciante?._id || item.comerciante) === String(merchantId))
    : order.productos;

  return items.map((item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.nombre || item.producto?.nombre || 'Producto'}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.cantidad}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(item.subtotal)}</td>
    </tr>
  `).join('');
}

function baseLayout(title, intro, content) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <div style="background:#0f172a;color:white;padding:28px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#cbd5e1;">${BRAND.name}</p>
          <h1 style="margin:0;font-size:24px;line-height:1.2;">${title}</h1>
          <p style="margin:10px 0 0;color:#d1fae5;font-size:13px;">${BRAND.tagline}</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 20px;color:#374151;line-height:1.6;">${intro}</p>
          ${content}
          <div style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:18px;color:#6b7280;font-size:12px;line-height:1.6;">
            <p style="margin:0 0 6px;font-weight:700;color:#111827;">${BRAND.name}</p>
            <p style="margin:0;">Comercio digital, pagos seguros y coordinación logística para Colombia.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buyerReceiptTemplate(order) {
  const content = `
    <div style="border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:20px;">
      <p style="margin:0;color:#6b7280;font-size:13px;">Pedido</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;">${order.numeroOrden}</p>
      <p style="margin:12px 0 0;color:#047857;font-weight:700;">Pago confirmado por ${formatMoney(order.total)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:12px;text-align:left;border-bottom:1px solid #d1d5db;">Producto</th>
          <th style="padding:12px;text-align:center;border-bottom:1px solid #d1d5db;">Cant.</th>
          <th style="padding:12px;text-align:right;border-bottom:1px solid #d1d5db;">Total</th>
        </tr>
      </thead>
      <tbody>${renderItems(order)}</tbody>
    </table>
  `;
  return baseLayout(
    'Pago confirmado',
    `Hola ${order.cliente?.nombre || 'cliente'}, Andino Express confirmó el pago con Wompi y tu pedido ya quedó registrado.`,
    content
  );
}

function merchantSaleTemplate(order, merchant, merchantTotal) {
  const content = `
    <div style="border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:20px;">
      <p style="margin:0;color:#6b7280;font-size:13px;">Pedido</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;">${order.numeroOrden}</p>
      <p style="margin:12px 0 0;color:#047857;font-weight:700;">Venta confirmada por ${formatMoney(merchantTotal)}</p>
    </div>
    <p style="margin:0 0 14px;color:#4b5563;font-size:14px;line-height:1.6;">
      Este correo incluye únicamente los productos de este pedido asociados a tu cuenta de comerciante.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:12px;text-align:left;border-bottom:1px solid #d1d5db;">Producto</th>
          <th style="padding:12px;text-align:center;border-bottom:1px solid #d1d5db;">Cant.</th>
          <th style="padding:12px;text-align:right;border-bottom:1px solid #d1d5db;">Total</th>
        </tr>
      </thead>
      <tbody>${renderItems(order, merchant._id)}</tbody>
    </table>
  `;
  return baseLayout(
    'Nueva venta confirmada',
    `Hola ${merchant.nombre || 'comerciante'}, Andino Express confirmó el pago con Wompi. Puedes preparar los productos asociados a este pedido.`,
    content
  );
}

async function sendBuyerReceipt(order) {
  if (!order.cliente?.email) {
    return { ok: false, skipped: true, reason: 'buyer_email_missing' };
  }

  return sendTransactionalEmail({
    to: order.cliente.email,
    subject: `Andino Express - pago confirmado ${order.numeroOrden}`,
    html: buyerReceiptTemplate(order)
  }, {
    type: 'buyer_order_receipt',
    orderId: String(order._id)
  });
}

async function sendMerchantSaleNotifications(order) {
  const merchantIds = [...new Set(order.productos.map((item) => String(item.comerciante?._id || item.comerciante)))];
  const results = [];

  for (const merchantId of merchantIds) {
    const merchant = await User.findById(merchantId).select('nombre email').lean();
    if (!merchant?.email) {
      results.push({ ok: false, skipped: true, merchantId, reason: 'merchant_email_missing' });
      continue;
    }

    const merchantTotal = order.productos
      .filter((item) => String(item.comerciante?._id || item.comerciante) === merchantId)
      .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    const result = await sendTransactionalEmail({
      to: merchant.email,
      subject: `Andino Express - nueva venta ${order.numeroOrden}`,
      html: merchantSaleTemplate(order, merchant, merchantTotal)
    }, {
      type: 'merchant_sale_notification',
      orderId: String(order._id)
    });
    results.push({ ...result, merchantId });
  }

  return results;
}

async function sendApprovedOrderEmails(order) {
  logger.info('order_transactional_email_start', { orderId: order._id });
  const buyer = await sendBuyerReceipt(order);
  const merchants = await sendMerchantSaleNotifications(order);
  return { buyer, merchants };
}

module.exports = {
  sendApprovedOrderEmails,
  sendBuyerReceipt,
  sendMerchantSaleNotifications
};
