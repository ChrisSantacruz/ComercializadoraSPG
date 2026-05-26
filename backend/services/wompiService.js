const axios = require('axios');
const crypto = require('crypto-js');
const logger = require('../utils/logger');

class WompiService {
    constructor() {
        this.publicKey = process.env.WOMPI_PUBLIC_KEY;
        this.privateKey = process.env.WOMPI_PRIVATE_KEY;
        this.eventsSecret = process.env.WOMPI_EVENTS_SECRET;
        this.integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
        this.apiUrl = process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';

        this.environment = this.apiUrl.includes('sandbox') || String(this.publicKey || '').includes('test')
            ? 'sandbox'
            : 'production';

        logger.info('wompi_service_initialized', {
            environment: this.environment,
            apiUrl: this.apiUrl,
            hasPublicKey: Boolean(this.publicKey),
            hasPrivateKey: Boolean(this.privateKey),
            hasEventsSecret: Boolean(this.eventsSecret),
            hasIntegritySecret: Boolean(this.integritySecret)
        });
    }

    validateStartupConfig({ failFast = process.env.NODE_ENV === 'production' } = {}) {
        const missing = [];
        if (!this.publicKey) missing.push('WOMPI_PUBLIC_KEY');
        if (!this.privateKey) missing.push('WOMPI_PRIVATE_KEY');
        if (!this.eventsSecret) missing.push('WOMPI_EVENTS_SECRET');
        if (!this.integritySecret) missing.push('WOMPI_INTEGRITY_SECRET');
        if (!this.apiUrl) missing.push('WOMPI_API_URL');

        const isSandboxUrl = this.apiUrl.includes('sandbox.wompi.co');
        const usesTestKeys = [this.publicKey, this.privateKey, this.eventsSecret, this.integritySecret]
            .filter(Boolean)
            .every((value) => String(value).includes('_test_') || String(value).startsWith('test_') || String(value).startsWith('pub_test') || String(value).startsWith('prv_test'));
        const usesProdKeys = [this.publicKey, this.privateKey, this.eventsSecret, this.integritySecret]
            .filter(Boolean)
            .every((value) => String(value).includes('_prod_') || String(value).startsWith('prod_') || String(value).startsWith('pub_prod') || String(value).startsWith('prv_prod'));

        const mixedEnvironment = !missing.length && ((isSandboxUrl && !usesTestKeys) || (!isSandboxUrl && !usesProdKeys));

        if (missing.length || mixedEnvironment) {
            logger.error('wompi_config_invalid', {
                missing,
                apiUrl: this.apiUrl,
                environment: this.environment,
                mixedEnvironment
            });
            if (failFast) {
                throw new Error(`Wompi configuration invalid: ${missing.join(', ') || 'mixed environment keys'}`);
            }
            return false;
        }

        logger.info('wompi_config_valid', { environment: this.environment, apiUrl: this.apiUrl });
        return true;
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
                description: `Pago del pedido ${reference} - Andino Express`,
                single_use: paymentData.singleUse !== false,
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
                    delivery_method: paymentData.deliveryMethod || 'delivery',
                    pickup_location: paymentData.pickupLocation?.name || undefined,
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
                    
                    logger.debug('wompi_customer_data_added', {
                        phone: payload.customer_data.phone_number,
                        hasEmail: !!payload.customer_data.email
                    });
                } else {
                    logger.warn('wompi_customer_phone_invalid', {});
                    payload.customer_data = {
                        phone_number: '3001234567',
                        full_name: 'Cliente Andino Express',
                        legal_id_type: 'CC',
                        legal_id: '12345678'
                    };
                }
            } else {
                logger.warn('wompi_customer_data_incomplete', {});
                payload.customer_data = {
                    phone_number: '3001234567',
                    full_name: 'Cliente Andino Express',
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

            logger.info('wompi_payment_link_create', {
                amount_in_cents: payload.amount_in_cents,
                name: payload.name,
                reference
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

            logger.info('wompi_payment_link_created', {
                id: response.data.data?.id,
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
            logger.error('wompi_payment_link_failed', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                message: error.message,
                url: error.config?.url,
                method: error.config?.method
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
            logger.debug('wompi_transaction_status_get', { transactionId });
            
            const response = await axios.get(
                `${this.apiUrl}/transactions/${transactionId}`,
                { 
                    headers: {
                        'Authorization': `Bearer ${this.privateKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info('wompi_transaction_status_retrieved', {
                id: transactionId,
                status: response.data.data?.status,
                amount: response.data.data?.amount_in_cents
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('wompi_transaction_status_failed', {
                transactionId,
                status: error.response?.status,
                message: error.message
            });
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
            logger.error('wompi_payment_link_get_failed', { linkId, status: error.response?.status, message: error.message });
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
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
            logger.error('wompi_acceptance_token_failed', { status: error.response?.status, message: error.message });
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
            logger.error('wompi_card_tokenize_failed', { status: error.response?.status, message: error.message });
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
                {
                    headers: {
                        'Authorization': `Bearer ${this.privateKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('wompi_card_transaction_failed', { status: error.response?.status, message: error.message });
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
            logger.error('wompi_payment_methods_failed', { status: error.response?.status, message: error.message });
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }
}

module.exports = new WompiService();
