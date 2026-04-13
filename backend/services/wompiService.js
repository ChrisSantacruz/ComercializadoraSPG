const axios = require('axios');
const crypto = require('crypto-js');

class WompiService {
    constructor() {
        this.publicKey = process.env.WOMPI_PUBLIC_KEY;
        this.privateKey = process.env.WOMPI_PRIVATE_KEY;
        this.eventsSecret = process.env.WOMPI_EVENTS_SECRET;
        this.integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
        this.apiUrl = process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';
        
        console.log('🔧 Wompi Service initialized:', {
            publicKey: this.publicKey ? `${this.publicKey.substring(0, 20)}...` : 'NOT SET',
            privateKey: this.privateKey ? `${this.privateKey.substring(0, 20)}...` : 'NOT SET',
            apiUrl: this.apiUrl
        });
    }

    /**
     * Crear un enlace de pago siguiendo la documentación oficial de Wompi
     * https://docs.wompi.co/docs/colombia/links-de-pago/
     */
    async createPaymentLink(paymentData) {
        try {
            const { amount, currency, reference, customerData, redirectUrl } = paymentData;
            
            // Validar datos requeridos según documentación
            if (!amount || !reference) {
                throw new Error('amount_in_cents and name are required');
            }

            // Construir payload según la documentación oficial con configuración robusta
            const payload = {
                name: `Pedido #${reference}`,
                description: `Pago del pedido ${reference} - Comercializadora SPG`,
                single_use: true, // Un solo uso por enlace de pago
                collect_shipping: false,
                currency: currency || 'COP',
                amount_in_cents: Math.round(amount * 100), // Convertir a centavos
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
                redirect_url: redirectUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/wompi/return?reference=${reference}`,
                
                // Configuraciones adicionales para evitar pantalla en blanco
                default_language: 'es',
                collect_customer_legal_id: false, // Simplificar para evitar errores
                
                // Meta data para tracking y debugging
                meta: {
                    order_reference: reference,
                    environment: process.env.NODE_ENV || 'development',
                    timestamp: new Date().toISOString()
                }
            };

            // Solo agregar customer_data si tenemos información completa y válida
            if (customerData && customerData.name && customerData.phone) {
                // Limpiar y validar número de teléfono
                const cleanPhone = customerData.phone.replace(/\D/g, '');
                if (cleanPhone.length >= 10) {
                    payload.customer_data = {
                        phone_number: cleanPhone,
                        full_name: customerData.name.trim(),
                        legal_id_type: customerData.documentType || 'CC',
                        legal_id: customerData.document || '12345678'
                    };

                    // Solo agregar email si es válido
                    if (customerData.email && customerData.email.includes('@') && customerData.email.length > 5) {
                        payload.customer_data.email = customerData.email.trim();
                    }
                    
                    console.log('👤 Customer data added:', {
                        phone: payload.customer_data.phone_number,
                        name: payload.customer_data.full_name,
                        hasEmail: !!payload.customer_data.email
                    });
                } else {
                    console.log('⚠️  Phone number invalid, using defaults');
                    payload.customer_data = {
                        phone_number: '3001234567',
                        full_name: 'Cliente ComercializadoraSPG',
                        legal_id_type: 'CC',
                        legal_id: '12345678'
                    };
                }
            } else {
                console.log('⚠️  Customer data incomplete, using defaults');
                payload.customer_data = {
                    phone_number: '3001234567',
                    full_name: 'Cliente ComercializadoraSPG',
                    legal_id_type: 'CC',
                    legal_id: '12345678'
                };
            }

            // Solo agregar shipping_address si tenemos dirección completa
            if (customerData?.address?.street && customerData?.address?.city) {
                payload.shipping_address = {
                    address_line_1: customerData.address.street,
                    city: customerData.address.city,
                    region: customerData.address.region || customerData.address.city,
                    country: 'CO',
                    postal_code: customerData.address.postalCode || '110111'
                };
            }

            console.log('📦 Creating Wompi payment link:', {
                amount_in_cents: payload.amount_in_cents,
                name: payload.name,
                customer: customerData?.name,
                phone: customerData?.phone
            });

            // Headers según documentación
            const headers = {
                'Authorization': `Bearer ${this.privateKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const response = await axios.post(
                `${this.apiUrl}/payment_links`,
                payload,
                { headers }
            );

            console.log('✅ Payment link created successfully:', {
                id: response.data.data?.id,
                generatedPermalink: `https://checkout.wompi.co/l/${response.data.data?.id}`
            });

            // Agregar el permalink generado a la respuesta
            const enrichedData = {
                ...response.data,
                data: {
                    ...response.data.data,
                    permalink: `https://checkout.wompi.co/l/${response.data.data?.id}`
                }
            };

            return {
                success: true,
                data: enrichedData
            };

        } catch (error) {
            console.error('❌ Error creating payment link:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });
            
            return {
                success: false,
                error: {
                    type: error.response?.data?.error?.type || 'UNKNOWN_ERROR',
                    message: error.response?.data?.error?.message || error.message,
                    details: error.response?.data?.error || null
                }
            };
        }
    }

    /**
     * Consultar estado de una transacción
     * https://docs.wompi.co/docs/colombia/inicio-rapido/
     */
    async getTransactionStatus(transactionId) {
        try {
            console.log('🔍 Getting transaction status:', transactionId);
            
            const response = await axios.get(
                `${this.apiUrl}/transactions/${transactionId}`,
                { 
                    headers: {
                        'Authorization': `Bearer ${this.privateKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Transaction status retrieved:', {
                id: transactionId,
                status: response.data.data?.status,
                amount: response.data.data?.amount_in_cents
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Error getting transaction status:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || { message: error.message }
            };
        }
    }

    /**
     * Obtener información de un enlace de pago
     */
    async getPaymentLink(linkId) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/payment_links/${linkId}`,
                { headers: this.headers }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error getting payment link:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Validar integridad de evento webhook
     */
    validateEventIntegrity(signature, timestamp, requestBody) {
        try {
            const concatenatedString = `${timestamp}.${JSON.stringify(requestBody)}`;
            const computedSignature = crypto.HmacSHA256(concatenatedString, this.integritySecret).toString();
            
            // Wompi envía la firma como: "t=timestamp,v1=signature"
            const signatures = signature.split(',');
            const timestampFromHeader = signatures.find(s => s.startsWith('t=')).split('=')[1];
            const signatureFromHeader = signatures.find(s => s.startsWith('v1=')).split('=')[1];

            // Validar timestamp (no más de 5 minutos de diferencia)
            const now = Math.floor(Date.now() / 1000);
            const eventTime = parseInt(timestampFromHeader);
            if (Math.abs(now - eventTime) > 300) {
                return false;
            }

            return signatureFromHeader === computedSignature;
        } catch (error) {
            console.error('Error validating event integrity:', error);
            return false;
        }
    }

    /**
     * Procesar evento de webhook
     */
    processWebhookEvent(eventData) {
        const { event, data } = eventData;
        
        switch (event) {
            case 'transaction.updated':
                return this.handleTransactionUpdated(data);
            case 'payment_link.transaction':
                return this.handlePaymentLinkTransaction(data);
            default:
                console.log(`Unhandled event type: ${event}`);
                return { processed: false };
        }
    }

    /**
     * Manejar actualización de transacción
     */
    handleTransactionUpdated(transactionData) {
        console.log('Transaction updated:', transactionData);
        return {
            processed: true,
            type: 'transaction_updated',
            data: transactionData
        };
    }

    /**
     * Manejar transacción de enlace de pago
     */
    handlePaymentLinkTransaction(transactionData) {
        console.log('Payment link transaction:', transactionData);
        return {
            processed: true,
            type: 'payment_link_transaction',
            data: transactionData
        };
    }

    /**
     * Crear token de aceptación para términos y condiciones
     */
    async createAcceptanceToken() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/merchants/${this.publicKey}`,
                { 
                    headers: {
                        'Authorization': `Bearer ${this.publicKey}`
                    } 
                }
            );

            const presigned = response.data.data.presigned_acceptance;
            
            return {
                success: true,
                acceptanceToken: presigned.acceptance_token,
                permalink: presigned.permalink
            };
        } catch (error) {
            console.error('Error creating acceptance token:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Tokenizar tarjeta de crédito
     */
    async tokenizeCard(cardData) {
        try {
            const payload = {
                number: cardData.number,
                cvc: cardData.cvc,
                exp_month: cardData.expMonth,
                exp_year: cardData.expYear,
                card_holder: cardData.holderName
            };

            const response = await axios.post(
                `${this.apiUrl}/tokens/cards`,
                payload,
                { 
                    headers: {
                        'Authorization': `Bearer ${this.publicKey}`
                    } 
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error tokenizing card:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Crear transacción directa con tarjeta tokenizada
     */
    async createCardTransaction(transactionData) {
        try {
            const { amount, currency, reference, cardToken, customerData, acceptanceToken } = transactionData;
            
            const payload = {
                amount_in_cents: Math.round(amount * 100),
                currency: currency || 'COP',
                signature: this.generateSignature(reference, amount, currency),
                customer_email: customerData.email,
                payment_method: {
                    type: 'CARD',
                    token: cardToken,
                    installments: 1
                },
                reference: reference,
                acceptance_token: acceptanceToken,
                customer_data: {
                    phone_number: customerData.phone,
                    full_name: customerData.name,
                    legal_id: customerData.document,
                    legal_id_type: customerData.documentType || 'CC'
                }
            };

            const response = await axios.post(
                `${this.apiUrl}/transactions`,
                payload,
                { headers: this.headers }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error creating card transaction:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Generar firma para transacciones
     */
    generateSignature(reference, amount, currency = 'COP') {
        const amountInCents = Math.round(amount * 100);
        const concatenatedString = `${reference}${amountInCents}${currency}${this.integritySecret}`;
        return crypto.SHA256(concatenatedString).toString();
    }

    /**
     * Obtener métodos de pago disponibles
     */
    async getPaymentMethods() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/payment_methods`,
                { 
                    headers: {
                        'Authorization': `Bearer ${this.publicKey}`
                    } 
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Error getting payment methods:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
}

module.exports = new WompiService();
