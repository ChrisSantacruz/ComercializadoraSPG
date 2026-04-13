const wompiService = require('../services/wompiService');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const { sendOrderConfirmationEmail } = require('../utils/email');

const wompiController = {
    /**
     * Crear enlace de pago directo (sin orden preexistente)
     */
    async createPaymentLink(req, res) {
        try {
            const orderData = req.body;
            const userId = req.usuario?._id || 'test-user'; // Fallback para pruebas

            console.log('🚀 Creating payment link with order data:', {
                orderId: orderData.orderId,
                amount: orderData.amount,
                customerName: orderData.customerData?.fullName,
                user: userId
            });

            // Validaciones básicas
            if (!orderData.amount || !orderData.orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos: amount y orderId'
                });
            }

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

            // Preparar datos del cliente desde el request
            const customerData = {
                name: orderData.customerData?.fullName || 'Cliente',
                phone: orderData.customerData?.phoneNumber || '3000000000',
                email: orderData.customerData?.email || '',
                document: orderData.customerData?.legalId || '12345678',
                documentType: orderData.customerData?.legalIdType || 'CC'
            };

            // Agregar dirección si está disponible
            if (orderData.shippingAddress) {
                customerData.address = {
                    street: orderData.shippingAddress.addressLine1,
                    city: orderData.shippingAddress.city,
                    region: orderData.shippingAddress.region,
                    postalCode: orderData.shippingAddress.postalCode || '110111'
                };
            }

            console.log('👤 Customer data prepared:', {
                name: customerData.name,
                phone: customerData.phone,
                hasEmail: !!customerData.email,
                hasAddress: !!customerData.address
            });

            // Crear enlace de pago
            const paymentData = {
                amount: orderData.amount,
                currency: orderData.currency || 'COP',
                reference: orderData.orderId,
                customerData,
                redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/wompi/return?orderId=${orderData.orderId}&reference=${orderData.orderId}`
            };

            console.log('💳 Creating payment link with data:', {
                amount: paymentData.amount,
                reference: paymentData.reference,
                customerName: customerData.name,
                redirectUrl: paymentData.redirectUrl
            });

            const result = await wompiService.createPaymentLink(paymentData);

            if (result.success) {
                console.log('✅ Payment link created successfully:', {
                    paymentLinkId: result.data?.data?.id,
                    permalink: result.data?.data?.permalink
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
                console.error('❌ Failed to create payment link:', result.error);

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
            console.error('💥 Exception in createPaymentLink:', error);
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
            const userId = req.user.id;

            console.log('🚀 Creating payment link for order:', orderId, 'user:', userId);

            // Buscar la orden
            const order = await Order.findById(orderId).populate('cliente');
            if (!order) {
                console.error('❌ Order not found:', orderId);
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Verificar que la orden pertenece al usuario
            if (order.cliente._id.toString() !== userId) {
                console.error('❌ User not authorized for order:', userId, 'order owner:', order.cliente._id);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para procesar esta orden'
                });
            }

            // Verificar que la orden esté en estado pendiente
            if (order.estado !== 'pendiente') {
                console.error('❌ Order not in pending state:', order.estado);
                return res.status(400).json({
                    success: false,
                    message: 'La orden no está en estado pendiente'
                });
            }

            // Preparar datos del cliente con validaciones mejoradas
            const customerData = {
                name: order.direccionEntrega?.nombre || order.cliente.nombre || order.cliente.nombreCompleto || 'Cliente',
                phone: order.direccionEntrega?.telefono || order.cliente.telefono || '3000000000',
                email: order.cliente.email,
                document: order.cliente.documento || order.cliente.cedula || '12345678',
                documentType: 'CC'
            };

            // Solo agregar dirección si tenemos datos completos
            if (order.direccionEntrega?.calle && order.direccionEntrega?.ciudad) {
                customerData.address = {
                    street: order.direccionEntrega.calle,
                    city: order.direccionEntrega.ciudad,
                    region: order.direccionEntrega.departamento || order.direccionEntrega.ciudad,
                    postalCode: order.direccionEntrega.codigoPostal || '110111'
                };
            }

            // Si es un objeto Address, extraer los datos correctamente
            if (order.direccionEntrega && typeof order.direccionEntrega === 'object' && order.direccionEntrega.direccion) {
                customerData.name = order.direccionEntrega.nombreDestinatario || customerData.name;
                customerData.phone = order.direccionEntrega.telefono || customerData.phone;
                customerData.address = {
                    street: order.direccionEntrega.direccion.calle,
                    city: order.direccionEntrega.direccion.ciudad,
                    region: order.direccionEntrega.direccion.departamento,
                    postalCode: order.direccionEntrega.direccion.codigoPostal || '110111'
                };
            }

            console.log('📝 Customer data prepared:', {
                name: customerData.name,
                phone: customerData.phone,
                email: customerData.email,
                hasAddress: !!customerData.address,
                hasDocument: !!customerData.document
            });

            // Validar que tenemos los datos mínimos requeridos
            if (!customerData.name || !customerData.phone) {
                console.error('❌ Missing required customer data:', { name: !!customerData.name, phone: !!customerData.phone });
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
                redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/wompi/return?orderId=${order._id}&reference=${order._id}`
            };

            console.log('💳 Creating payment link with data:', {
                amount: paymentData.amount,
                reference: paymentData.reference,
                customerName: customerData.name,
                redirectUrl: paymentData.redirectUrl
            });

            const result = await wompiService.createPaymentLink(paymentData);

            if (result.success) {
                // Actualizar la orden con la información del pago
                order.paymentInfo = {
                    method: 'wompi',
                    paymentLinkId: result.data.data.id,
                    paymentUrl: result.data.data.permalink,
                    createdAt: new Date()
                };
                
                // Cambiar estado a payment_pending
                order.estado = 'payment_pending';
                await order.save();

                console.log('✅ Payment link created and order updated:', {
                    orderId: order._id,
                    paymentLinkId: result.data.data.id,
                    permalink: result.data.data.permalink
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
                console.error('❌ Failed to create payment link:', {
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
            console.error('💥 Exception in createPaymentLink:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Webhook para recibir eventos de Wompi
     */
    async webhook(req, res) {
        try {
            const signature = req.headers['x-signature'];
            const timestamp = req.headers['x-timestamp'];
            
            // express.raw() entrega un Buffer, convertir a objeto
            let eventData;
            if (Buffer.isBuffer(req.body)) {
                eventData = JSON.parse(req.body.toString('utf8'));
            } else {
                eventData = req.body;
            }

            console.log('Webhook received:', {
                signature,
                timestamp,
                event: eventData?.event
            });

            // Validar integridad del evento
            if (signature && !wompiService.validateEventIntegrity(signature, timestamp, eventData)) {
                console.error('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }

            // Procesar evento
            const processResult = wompiService.processWebhookEvent(eventData);
            
            if (processResult.processed) {
                await this.handlePaymentEvent(eventData);
            }

            res.status(200).json({ received: true });
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    /**
     * Manejar eventos de pago
     */
    async handlePaymentEvent(eventData) {
        try {
            const { event, data } = eventData;

            if (event === 'transaction.updated' && data.transaction) {
                const transaction = data.transaction;
                const reference = transaction.reference;

                // Buscar la orden por referencia
                const order = await Order.findById(reference);
                if (!order) {
                    console.error(`Order not found for reference: ${reference}`);
                    return;
                }

                // Actualizar estado según el estado de la transacción
                switch (transaction.status) {
                    case 'APPROVED':
                        order.estado = 'confirmado';
                        order.paymentInfo = order.paymentInfo || {};
                        order.paymentInfo.transactionId = transaction.id;
                        order.paymentInfo.paymentStatus = 'approved';
                        order.paymentInfo.paidAt = new Date();
                        
                        // AHORA SÍ descontar el stock de los productos
                        for (const item of order.productos) {
                            try {
                                await Product.findByIdAndUpdate(item.producto, {
                                    $inc: { 
                                        stock: -item.cantidad,
                                        'estadisticas.vendidos': item.cantidad
                                    }
                                });
                                console.log(`✅ Stock actualizado para producto ${item.producto}: -${item.cantidad}`);
                            } catch (stockError) {
                                console.error(`❌ Error actualizando stock del producto ${item.producto}:`, stockError);
                            }
                        }
                        
                        // Crear notificación de pago exitoso
                        await Notification.create({
                            user: order.cliente,
                            type: 'payment_success',
                            title: 'Pago exitoso',
                            message: `Tu pago por $${order.total.toLocaleString()} ha sido procesado exitosamente`,
                            relatedOrder: order._id
                        });
                        
                        // Enviar comprobante de pago por email
                        try {
                            // Obtener datos completos de la orden con población
                            const orderWithDetails = await Order.findById(order._id)
                                .populate('cliente', 'nombre email')
                                .populate('productos.producto', 'nombre imagenPrincipal');
                            
                            await sendOrderConfirmationEmail(orderWithDetails);
                            console.log(`📧 Email de confirmación enviado a ${orderWithDetails.cliente.email}`);
                        } catch (emailError) {
                            console.error('❌ Error enviando email de confirmación:', emailError);
                            // No fallar el webhook por error de email
                        }
                        break;

                    case 'DECLINED':
                        order.estado = 'cancelado';
                        order.paymentInfo = order.paymentInfo || {};
                        order.paymentInfo.paymentStatus = 'declined';
                        order.paymentInfo.failureReason = transaction.status_message;
                        
                        // Crear notificación de pago fallido
                        await Notification.create({
                            user: order.cliente,
                            type: 'payment_failed',
                            title: 'Pago rechazado',
                            message: `Tu pago ha sido rechazado. Motivo: ${transaction.status_message}`,
                            relatedOrder: order._id
                        });
                        break;

                    case 'PENDING':
                        order.estado = 'pendiente';
                        order.paymentInfo = order.paymentInfo || {};
                        order.paymentInfo.transactionId = transaction.id;
                        order.paymentInfo.paymentStatus = 'pending';
                        break;

                    case 'ERROR':
                        order.estado = 'cancelado';
                        order.paymentInfo = order.paymentInfo || {};
                        order.paymentInfo.paymentStatus = 'error';
                        order.paymentInfo.failureReason = transaction.status_message;
                        break;
                }

                await order.save();
                console.log(`Order ${order._id} updated to estado: ${order.estado}`);
            }
        } catch (error) {
            console.error('Error handling payment event:', error);
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
            console.error('Error in getTransactionStatus:', error);
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
            console.error('Error in getAcceptanceToken:', error);
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
            console.error('Error in tokenizeCard:', error);
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
            const userId = req.user.id;

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
            console.error('Error in createCardTransaction:', error);
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
            console.error('Error in getPaymentMethods:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};

module.exports = wompiController;
