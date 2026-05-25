const wompiService = require('../services/wompiService');
const wompiOrderSync = require('../services/wompiOrderSync');
const Order = require('../models/Order');
const crypto = require('crypto-js');
const logger = require('../utils/logger');

function getNested(obj, path) {
    return String(path || '')
        .split('.')
        .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function verifyWompiEventSignature(eventData) {
    const checksum = eventData?.signature?.checksum;
    const properties = eventData?.signature?.properties;
    const timestamp = eventData?.timestamp;
    const secret = process.env.WOMPI_EVENTS_SECRET;

    if (!checksum || !Array.isArray(properties) || !timestamp || !secret) {
        return false;
    }

    const values = properties.map((property) => {
        const normalizedPath = String(property).startsWith('data.')
            ? String(property)
            : `data.${property}`;
        const value = getNested(eventData, normalizedPath);
        return value == null ? '' : String(value);
    });

    const candidate = `${values.join('')}${timestamp}${secret}`;
    const computed = crypto.SHA256(candidate).toString();
    return computed === checksum;
}

const wompiController = {
    /**
     * Crear enlace de pago directo (sin orden preexistente)
     */
    async createPaymentLink(req, res) {
        try {
            const orderData = req.body;
            if (process.env.NODE_ENV === 'production' && !req.usuario?._id) {
                return res.status(401).json({
                    success: false,
                    message: 'No autorizado'
                });
            }

            // Validaciones básicas
            if (!orderData.amount || !orderData.orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos: amount y orderId'
                });
            }

            const userId = (req.usuario?._id || req.usuario?.id)?.toString();
            const order = await Order.findById(orderData.orderId).populate('cliente', 'nombre email telefono');
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }
            if (userId && order.cliente?._id?.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para procesar esta orden'
                });
            }
            if (Number(orderData.amount) !== Number(order.total)) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto del pago no coincide con el total del pedido'
                });
            }

            const isPickupOrder = order.tipoEntrega === 'recoger_establecimiento' || order.deliveryMethod === 'pickup';

            // Validar monto mínimo de Wompi (1,500 COP = 150,000 centavos)
            const minimumAmount = 1500;
            if (orderData.amount < minimumAmount) {
                return res.status(400).json({
                    success: false,
                    message: `El monto mínimo para pagos con Wompi es $${minimumAmount.toLocaleString()} COP`,
                    error: {
                        type: 'MINIMUM_AMOUNT_ERROR',
                        minimumAmount: minimumAmount,
                        providedAmount: orderData.amount
                    }
                });
            }

            const legalIdRaw = (orderData.customerData?.legalId || '').toString().replace(/\D/g, '');
            if (legalIdRaw.length < 6 || legalIdRaw.length > 11) {
                return res.status(400).json({
                    success: false,
                    message: 'El documento del pagador es obligatorio y debe tener entre 6 y 11 dígitos.'
                });
            }

            // Preparar datos del cliente desde el request
            const customerData = {
                name: orderData.customerData?.fullName || order.cliente?.nombre || 'Cliente',
                phone: (orderData.customerData?.phoneNumber || order.cliente?.telefono || '').toString().replace(/\s/g, '') || '3000000000',
                email: orderData.customerData?.email || order.cliente?.email || '',
                document: legalIdRaw,
                documentType: orderData.customerData?.legalIdType || 'CC'
            };

            // Agregar dirección solo para entrega a domicilio; pickup nunca debe enviar shipping a Wompi.
            if (!isPickupOrder && orderData.shippingAddress) {
                customerData.address = {
                    street: orderData.shippingAddress.addressLine1,
                    city: orderData.shippingAddress.city,
                    region: orderData.shippingAddress.region,
                    postalCode: orderData.shippingAddress.postalCode || '110111'
                };
            }

            // Crear enlace de pago
            const paymentData = {
                amount: orderData.amount,
                currency: orderData.currency || 'COP',
                reference: orderData.orderId,
                customerData,
                deliveryMethod: isPickupOrder ? 'pickup' : 'delivery',
                pickupLocation: isPickupOrder ? (order.pickupLocation || orderData.pickupLocation) : undefined,
                redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/wompi/return?orderId=${orderData.orderId}&reference=${orderData.orderId}`
            };

            const result = await wompiService.createPaymentLink(paymentData);

            if (result.success) {
                order.paymentInfo = {
                    method: 'wompi',
                    paymentLinkId: result.data?.data?.id,
                    paymentUrl: result.data?.data?.permalink,
                    paymentStatus: 'created',
                    wompiStatus: 'CREATED',
                    verificationSource: 'payment_link_create'
                };
                order.estado = 'payment_pending';
                await order.save();
                logger.info('payment_created', {
                    requestId: req.requestId,
                    orderId: order._id,
                    paymentLinkId: result.data?.data?.id,
                    amount: order.total
                });

                res.json({
                    success: true,
                    data: {
                        paymentUrl: result.data?.data?.permalink,
                        paymentLinkId: result.data?.data?.id,
                        qrCode: result.data?.data?.qr_code || null,
                        expiresAt: result.data?.data?.expires_at
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Error al crear enlace de pago',
                    error: {
                        type: result.error?.type || 'PAYMENT_LINK_ERROR',
                        message: result.error?.message || 'Error desconocido',
                        details: process.env.NODE_ENV === 'development' ? result.error?.details : undefined
                    }
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Crear enlace de pago con orden existente
     */
    async createPaymentLinkFromOrder(req, res) {
        try {
            const { orderId } = req.body;
            const userId = req.usuario._id.toString();

            logger.info('wompi_order_payment_link_start', { requestId: req.requestId, orderId, userId });

            // Buscar la orden
            const order = await Order.findById(orderId).populate('cliente');
            if (!order) {
                logger.warn('wompi_order_not_found', { requestId: req.requestId, orderId });
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Verificar que la orden pertenece al usuario
            if (order.cliente._id.toString() !== userId) {
                logger.warn('wompi_order_forbidden', { requestId: req.requestId, orderId, userId });
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para procesar esta orden'
                });
            }

            // Verificar que la orden esté en estado pendiente
            if (!['pendiente', 'payment_pending'].includes(order.estado)) {
                logger.warn('wompi_order_invalid_state', { requestId: req.requestId, orderId, state: order.estado });
                return res.status(400).json({
                    success: false,
                    message: 'La orden no está en estado pendiente de pago'
                });
            }

            const isPickupOrder = order.tipoEntrega === 'recoger_establecimiento' || order.deliveryMethod === 'pickup';

            // Preparar datos del cliente con validaciones mejoradas
            const customerData = {
                name: order.direccionEntrega?.nombre || order.cliente.nombre || order.cliente.nombreCompleto || 'Cliente',
                phone: order.direccionEntrega?.telefono || order.cliente.telefono || '3000000000',
                email: order.cliente.email,
                document: order.cliente.documento || order.cliente.cedula || '12345678',
                documentType: 'CC'
            };

            // Solo agregar dirección si tenemos datos completos
            if (!isPickupOrder && order.direccionEntrega?.calle && order.direccionEntrega?.ciudad) {
                customerData.address = {
                    street: order.direccionEntrega.calle,
                    city: order.direccionEntrega.ciudad,
                    region: order.direccionEntrega.departamento || order.direccionEntrega.ciudad,
                    postalCode: order.direccionEntrega.codigoPostal || '110111'
                };
            }

            // Si es un objeto Address, extraer los datos correctamente
            if (!isPickupOrder && order.direccionEntrega && typeof order.direccionEntrega === 'object' && order.direccionEntrega.direccion) {
                customerData.name = order.direccionEntrega.nombreDestinatario || customerData.name;
                customerData.phone = order.direccionEntrega.telefono || customerData.phone;
                customerData.address = {
                    street: order.direccionEntrega.direccion.calle,
                    city: order.direccionEntrega.direccion.ciudad,
                    region: order.direccionEntrega.direccion.departamento,
                    postalCode: order.direccionEntrega.direccion.codigoPostal || '110111'
                };
            }

            // Validar que tenemos los datos mínimos requeridos
            if (!customerData.name || !customerData.phone) {
                logger.warn('wompi_customer_required_missing', { requestId: req.requestId, orderId });
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos del cliente (nombre y teléfono son requeridos)'
                });
            }

            // Crear enlace de pago
            const paymentData = {
                amount: order.total,
                currency: 'COP',
                reference: order._id.toString(),
                customerData,
                deliveryMethod: isPickupOrder ? 'pickup' : 'delivery',
                pickupLocation: isPickupOrder ? order.pickupLocation : undefined,
                redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/wompi/return?orderId=${order._id}&reference=${order._id}`
            };

            logger.info('wompi_order_payment_link_create', {
                requestId: req.requestId,
                amount: paymentData.amount,
                reference: paymentData.reference,
            });

            const result = await wompiService.createPaymentLink(paymentData);

            if (result.success) {
                // Actualizar la orden con la información del pago
                order.paymentInfo = {
                    method: 'wompi',
                    paymentLinkId: result.data.data.id,
                    paymentUrl: result.data.data.permalink,
                    paymentStatus: 'created',
                    wompiStatus: 'CREATED',
                    verificationSource: 'payment_link_create',
                    createdAt: new Date()
                };
                
                // Cambiar estado a payment_pending
                order.estado = 'payment_pending';
                await order.save();

                logger.info('wompi_order_payment_link_created', {
                    requestId: req.requestId,
                    orderId: order._id,
                    paymentLinkId: result.data.data.id,
                });

                res.json({
                    success: true,
                    data: {
                        paymentUrl: result.data.data.permalink,
                        paymentLinkId: result.data.data.id,
                        qrCode: result.data.data.qr_code || null,
                        expiresAt: result.data.data.expires_at
                    }
                });
            } else {
                logger.warn('wompi_order_payment_link_failed', {
                    requestId: req.requestId,
                    error: result.error,
                    orderId: order._id
                });

                // Determinar el código de error HTTP apropiado
                let statusCode = 400;
                if (result.error?.type === 'AUTHENTICATION_ERROR') {
                    statusCode = 401;
                } else if (result.error?.type === 'AUTHORIZATION_ERROR') {
                    statusCode = 403;
                } else if (result.error?.type === 'SERVER_ERROR') {
                    statusCode = 500;
                }

                res.status(statusCode).json({
                    success: false,
                    message: 'Error al crear enlace de pago',
                    error: {
                        type: result.error?.type || 'PAYMENT_LINK_ERROR',
                        message: result.error?.message || 'Error desconocido',
                        details: process.env.NODE_ENV === 'development' ? result.error?.details : undefined
                    }
                });
            }
        } catch (error) {
            logger.error('wompi_create_payment_link_exception', { requestId: req.requestId, message: error.message });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Webhook Wompi: reconoce el evento y reconcilia contra GET /transactions/:id (fuente de verdad).
     * El cuerpo llega como Buffer (express.raw).
     */
    async webhook(req, res) {
        try {
            const rawBody = Buffer.isBuffer(req.body)
                ? req.body.toString('utf8')
                : typeof req.body === 'string'
                    ? req.body
                    : JSON.stringify(req.body);

            let eventData;
            try {
                eventData = JSON.parse(rawBody);
            } catch (parseErr) {
                return res.status(400).json({ error: 'invalid_json' });
            }

            if (!verifyWompiEventSignature(eventData)) {
                logger.warn('wompi_webhook_invalid_signature', { requestId: req.requestId });
                return res.status(401).json({ error: 'invalid_signature' });
            }

            const transactionId = wompiOrderSync.extractTransactionIdFromWebhookEvent(eventData);
            logger.info('wompi_webhook_received', {
                requestId: req.requestId,
                event: eventData?.event,
                hasTransactionId: Boolean(transactionId),
                environment: eventData?.environment
            });
            if (!transactionId) {
                return res.status(200).json({ received: true, ignored: true });
            }

            const syncResult = await wompiOrderSync.reconcileTransactionById(transactionId);
            if (!syncResult.ok && syncResult.reason === 'remote_fetch_failed') {
                return res.status(503).json({ error: 'wompi_unavailable' });
            }

            return res.status(200).json({ received: true });
        } catch (error) {
            logger.error('wompi_webhook_failed', { requestId: req.requestId, message: error.message });
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    /**
     * Tras redirect desde Wompi: el cliente autenticado confirma estado consultando la API de Wompi en servidor.
     */
    async confirmPaymentReturn(req, res) {
        try {
            const { transactionId, orderId } = req.body || {};
            logger.info('wompi_confirm_return_received', {
                requestId: req.requestId,
                hasTransactionId: Boolean(transactionId),
                hasOrderId: Boolean(orderId),
                bodyKeys: Object.keys(req.body || {})
            });

            if (!orderId) {
                return res.status(400).json({
                    exito: false,
                    mensaje: 'orderId es obligatorio para verificar el retorno de Wompi',
                    codigo: 'ORDER_ID_REQUIRED',
                    requestId: req.requestId
                });
            }

            const userId = req.usuario._id.toString();
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ exito: false, mensaje: 'Orden no encontrada' });
            }
            if (order.cliente.toString() !== userId) {
                return res.status(403).json({ exito: false, mensaje: 'No autorizado' });
            }

            const storedTransactionId = order.paymentInfo?.transactionId;
            const txId = transactionId || storedTransactionId;
            if (!txId) {
                logger.info('wompi_confirm_return_waiting_webhook', {
                    requestId: req.requestId,
                    orderId,
                    paymentLinkId: order.paymentInfo?.paymentLinkId,
                    state: order.estado
                });
                return res.json({
                    exito: true,
                    mensaje: 'Pago pendiente de confirmación por Wompi',
                    datos: {
                        order,
                        transactionStatus: order.paymentInfo?.wompiStatus || 'PENDING',
                        sync: { ok: true, pending: true, reason: 'waiting_for_wompi_transaction' }
                    }
                });
            }

            const remote = await wompiService.getTransactionStatus(txId);
            if (!remote.success) {
                if (!storedTransactionId && transactionId) {
                    logger.warn('wompi_confirm_return_unverified_query_transaction', {
                        requestId: req.requestId,
                        orderId,
                        transactionId,
                        reason: 'query_id_not_verified_by_wompi'
                    });
                    return res.json({
                        exito: true,
                        mensaje: 'Pago pendiente de confirmación por Wompi',
                        datos: {
                            order,
                            transactionStatus: order.paymentInfo?.wompiStatus || 'PENDING',
                            sync: { ok: true, pending: true, reason: 'unverified_return_transaction_id' }
                        }
                    });
                }
                return res.status(502).json({
                    exito: false,
                    mensaje: 'No se pudo verificar el pago con Wompi',
                    codigo: 'WOMPI_VERIFY_FAILED'
                });
            }

            const tx = remote.data?.data || remote.data;
            if (!tx || String(tx.reference) !== String(orderId)) {
                logger.warn('wompi_confirm_return_reference_mismatch', {
                    requestId: req.requestId,
                    orderId,
                    transactionId: txId,
                    receivedReference: tx?.reference
                });
                return res.status(400).json({
                    exito: false,
                    mensaje: 'La transacción no corresponde a este pedido',
                    codigo: 'REFERENCE_MISMATCH',
                    requestId: req.requestId
                });
            }

            const expected = wompiOrderSync.expectedAmountInCents(order);
            if (Number.isFinite(tx.amount_in_cents) && tx.amount_in_cents !== expected) {
                logger.warn('wompi_confirm_return_amount_mismatch', {
                    requestId: req.requestId,
                    orderId,
                    transactionId: txId,
                    expected,
                    received: tx.amount_in_cents
                });
                return res.status(400).json({
                    exito: false,
                    mensaje: 'El monto de la transacción no coincide con el pedido',
                    codigo: 'AMOUNT_MISMATCH',
                    requestId: req.requestId
                });
            }

            const syncResult = await wompiOrderSync.syncOrderWithTransaction(tx);
            if (!syncResult.ok) {
                return res.status(400).json({
                    exito: false,
                    mensaje: syncResult.reason || 'No se pudo actualizar el pedido',
                    datos: syncResult
                });
            }

            const fresh = await Order.findById(orderId).lean();
            return res.json({
                exito: true,
                mensaje: 'Estado verificado',
                datos: {
                    order: fresh,
                    transactionStatus: wompiOrderSync.normalizeWompiStatus(tx.status) || tx.status,
                    sync: syncResult
                }
            });
        } catch (error) {
            logger.error('wompi_confirm_return_failed', { requestId: req.requestId, message: error.message });
            return res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
        }
    },

    /**
     * Consultar estado de transacción
     */
    async getTransactionStatus(req, res) {
        try {
            const { transactionId } = req.params;

            const result = await wompiService.getTransactionStatus(transactionId);

            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Error al consultar transacción',
                    error: result.error
                });
            }
        } catch (error) {
            logger.error('wompi_get_transaction_status_failed', { requestId: req.requestId, message: error.message });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },

    /**
     * Obtener token de aceptación para términos y condiciones
     */
    async getAcceptanceToken(req, res) {
        try {
            const result = await wompiService.createAcceptanceToken();

            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        acceptanceToken: result.acceptanceToken,
                        permalink: result.permalink
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Error al obtener token de aceptación',
                    error: result.error
                });
            }
        } catch (error) {
            logger.error('wompi_acceptance_token_controller_failed', { requestId: req.requestId, message: error.message });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },

    /**
     * Tokenizar tarjeta
     */
    async tokenizeCard(req, res) {
        try {
            const { number, cvc, expMonth, expYear, holderName } = req.body;

            const cardData = {
                number,
                cvc,
                expMonth,
                expYear,
                holderName
            };

            const result = await wompiService.tokenizeCard(cardData);

            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Error al tokenizar tarjeta',
                    error: result.error
                });
            }
        } catch (error) {
            logger.error('wompi_tokenize_card_controller_failed', { requestId: req.requestId, message: error.message });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },

    /**
     * Crear transacción con tarjeta
     */
    async createCardTransaction(req, res) {
        try {
            const { orderId, cardToken, acceptanceToken } = req.body;
            const userId = req.usuario._id.toString();

            // Buscar la orden
            const order = await Order.findById(orderId).populate('cliente');
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Verificar que la orden pertenece al usuario
            if (order.cliente._id.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para procesar esta orden'
                });
            }

            // Preparar datos de la transacción
            const transactionData = {
                amount: order.total,
                currency: 'COP',
                reference: order._id.toString(),
                cardToken,
                acceptanceToken,
                customerData: {
                    name: order.direccionEntrega.nombre,
                    phone: order.direccionEntrega.telefono,
                    email: order.cliente.email,
                    document: order.cliente.documento || '12345678',
                    documentType: 'CC'
                }
            };

            const result = await wompiService.createCardTransaction(transactionData);

            if (result.success) {
                // Actualizar la orden
                order.paymentInfo = {
                    method: 'wompi_card',
                    transactionId: result.data.data.id,
                    paymentStatus: result.data.data.status
                };
                await order.save();

                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Error al procesar transacción',
                    error: result.error
                });
            }
        } catch (error) {
            logger.error('wompi_card_transaction_controller_failed', { requestId: req.requestId, message: error.message });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },

    /**
     * Obtener métodos de pago disponibles
     */
    async getPaymentMethods(req, res) {
        try {
            const result = await wompiService.getPaymentMethods();

            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Error al obtener métodos de pago',
                    error: result.error
                });
            }
        } catch (error) {
            logger.error('wompi_payment_methods_controller_failed', { requestId: req.requestId, message: error.message });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};

module.exports = wompiController;
