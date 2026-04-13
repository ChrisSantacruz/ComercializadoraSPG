import api from './api';

interface PaymentLinkData {
  orderId: string;
  amount?: number;
  currency?: string;
  customerData?: {
    fullName: string;
    email: string;
    phoneNumber: string;
    legalId: string;
    legalIdType: string;
  };
  shippingAddress?: {
    addressLine1: string;
    city: string;
    phoneNumber: string;
    region: string;
    postalCode?: string;
  };
  products?: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface CardData {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  holderName: string;
}

interface CardTransactionData {
  orderId: string;
  cardToken: string;
  acceptanceToken: string;
}

interface WompiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

class WompiService {
  // Crear enlace de pago
  async createPaymentLink(data: PaymentLinkData): Promise<WompiResponse> {
    try {
      console.log('🔗 WompiService: Creating payment link for order:', data.orderId);
      console.log('📦 WompiService: Full payment data:', JSON.stringify(data, null, 2));
      
      // Verificar token de autenticación
      const token = localStorage.getItem('auth-storage');
      console.log('🔐 WompiService: Auth token exists:', !!token);
      
      if (token) {
        try {
          const authData = JSON.parse(token);
          console.log('🔐 WompiService: Auth data structure:', {
            hasState: !!authData.state,
            hasToken: !!authData.state?.token,
            tokenStart: authData.state?.token?.substring(0, 20)
          });
        } catch (e) {
          console.error('🔐 WompiService: Error parsing auth token:', e);
        }
      }
      
      console.log('📡 WompiService: Sending request to /wompi/payment-link');
      const response = await api.post('/wompi/payment-link', data);
      
      console.log('✅ WompiService: Raw response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      // Verificar estructura de respuesta
      if (response.data && typeof response.data === 'object') {
        console.log('✅ WompiService: Response structure:', {
          hasSuccess: 'success' in response.data,
          hasExito: 'exito' in response.data,
          hasData: 'data' in response.data,
          hasDatos: 'datos' in response.data,
          successValue: response.data.success,
          exitoValue: response.data.exito
        });
        
        // Manejar tanto formato nuevo como viejo
        if (response.data.exito === true) {
          return {
            success: true,
            data: response.data.datos,
            message: response.data.mensaje
          };
        } else if (response.data.success === true) {
          return response.data;
        } else {
          return {
            success: false,
            error: response.data.error,
            message: response.data.mensaje || response.data.message
          };
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ WompiService: Detailed error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      return {
        success: false,
        error: error.response?.data?.error || {
          type: 'NETWORK_ERROR',
          message: error.message || 'Error de conexión'
        },
        message: error.response?.data?.mensaje || error.response?.data?.message || error.message
      };
    }
  }

  // Obtener estado de transacción
  async getTransactionStatus(transactionId: string): Promise<WompiResponse> {
    try {
      const response = await api.get(`/wompi/transaction/${transactionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting transaction status:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Obtener token de aceptación
  async getAcceptanceToken(): Promise<WompiResponse> {
    try {
      const response = await api.get('/wompi/acceptance-token');
      return response.data;
    } catch (error: any) {
      console.error('Error getting acceptance token:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Tokenizar tarjeta
  async tokenizeCard(cardData: CardData): Promise<WompiResponse> {
    try {
      const response = await api.post('/wompi/tokenize-card', cardData);
      return response.data;
    } catch (error: any) {
      console.error('Error tokenizing card:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Crear transacción con tarjeta
  async createCardTransaction(data: CardTransactionData): Promise<WompiResponse> {
    try {
      const response = await api.post('/wompi/card-transaction', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating card transaction:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Obtener métodos de pago disponibles
  async getPaymentMethods(): Promise<WompiResponse> {
    try {
      const response = await api.get('/wompi/payment-methods');
      return response.data;
    } catch (error: any) {
      console.error('Error getting payment methods:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Validar número de tarjeta (básico)
  validateCardNumber(cardNumber: string): boolean {
    // Remover espacios y guiones
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');
    
    // Verificar que solo contenga números
    if (!/^\d+$/.test(cleanNumber)) {
      return false;
    }

    // Verificar longitud (13-19 dígitos)
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    // Algoritmo de Luhn
    let sum = 0;
    let isEven = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  // Validar CVC
  validateCvc(cvc: string, cardType?: string): boolean {
    if (!/^\d+$/.test(cvc)) {
      return false;
    }

    // American Express tiene 4 dígitos, otros tienen 3
    if (cardType === 'amex') {
      return cvc.length === 4;
    }

    return cvc.length === 3;
  }

  // Validar fecha de expiración
  validateExpiryDate(month: string, year: string): boolean {
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return false;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Año debe ser mayor al actual o igual con mes mayor al actual
    if (yearNum < currentYear) {
      return false;
    }

    if (yearNum === currentYear && monthNum <= currentMonth) {
      return false;
    }

    return true;
  }

  // Detectar tipo de tarjeta por número
  detectCardType(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');
    
    // Visa
    if (/^4/.test(cleanNumber)) {
      return 'visa';
    }
    
    // Mastercard
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
      return 'mastercard';
    }
    
    // American Express
    if (/^3[47]/.test(cleanNumber)) {
      return 'amex';
    }
    
    // Discover
    if (/^6/.test(cleanNumber)) {
      return 'discover';
    }
    
    // Diners Club
    if (/^3[0689]/.test(cleanNumber)) {
      return 'diners';
    }
    
    return 'unknown';
  }

  // Formatear número de tarjeta
  formatCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');
    const cardType = this.detectCardType(cleanNumber);
    
    if (cardType === 'amex') {
      // American Express: xxxx xxxxxx xxxxx
      return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      // Otros: xxxx xxxx xxxx xxxx
      return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
  }

  // Utilidades para manejo de errores de Wompi
  getErrorMessage(error: any): string {
    if (!error) {
      return 'Error desconocido';
    }

    if (error.error?.type) {
      switch (error.error.type) {
        case 'INPUT_VALIDATION_ERROR':
          return 'Los datos ingresados no son válidos';
        case 'INVALID_PAYMENT_METHOD':
          return 'Método de pago no válido';
        case 'PAYMENT_DECLINED':
          return 'El pago ha sido rechazado';
        case 'INSUFFICIENT_FUNDS':
          return 'Fondos insuficientes';
        case 'EXPIRED_CARD':
          return 'La tarjeta ha expirado';
        case 'BLOCKED_CARD':
          return 'La tarjeta está bloqueada';
        default:
          return error.error.message || 'Error en el procesamiento del pago';
      }
    }
    
    return error.message || error.toString() || 'Error desconocido';
  }

  // Obtener clave pública de Wompi (desde env o config)
  getPublicKey(): string {
    return process.env.REACT_APP_WOMPI_PUBLIC_KEY || 'pub_test_QGjOJpFWM45bFUuCpUTPQMYs2UGwXXZW';
  }

  // Verificar configuración de Wompi
  checkConfiguration(): { isValid: boolean; message: string } {
    const publicKey = this.getPublicKey();
    
    if (!publicKey) {
      return {
        isValid: false,
        message: 'Clave pública de Wompi no configurada'
      };
    }

    if (!publicKey.startsWith('pub_')) {
      return {
        isValid: false,
        message: 'Clave pública de Wompi inválida'
      };
    }

    const isTest = publicKey.includes('test');
    
    return {
      isValid: true,
      message: isTest ? 'Configurado para ambiente de pruebas' : 'Configurado para producción'
    };
  }

  // Obtener información del ambiente
  getEnvironmentInfo(): { environment: 'test' | 'production'; publicKey: string } {
    const publicKey = this.getPublicKey();
    const isTest = publicKey.includes('test');
    
    return {
      environment: isTest ? 'test' : 'production',
      publicKey: publicKey
    };
  }
}

const wompiServiceInstance = new WompiService();
export default wompiServiceInstance;
