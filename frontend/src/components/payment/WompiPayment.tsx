import React, { useState, useEffect } from 'react';
import wompiService from '../../services/wompiService';

interface WompiPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: (transactionData: any) => void;
  onError: (error: any) => void;
  onCancel: () => void;
}

interface PaymentMethod {
  type: 'link' | 'card';
  name: string;
  description: string;
}

const WompiPayment: React.FC<WompiPaymentProps> = ({
  orderId,
  amount,
  onSuccess,
  onError,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'link' | 'card'>('link');
  const [acceptanceToken, setAcceptanceToken] = useState<string>('');
  const [acceptancePermalink, setAcceptancePermalink] = useState<string>('');
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Estados para tarjeta
  const [cardData, setCardData] = useState({
    number: '',
    cvc: '',
    expMonth: '',
    expYear: '',
    holderName: ''
  });

  const [cardErrors, setCardErrors] = useState({
    number: '',
    cvc: '',
    expMonth: '',
    expYear: '',
    holderName: ''
  });

  // Obtener token de aceptación al montar el componente
  useEffect(() => {
    loadAcceptanceToken();
  }, []);

  const loadAcceptanceToken = async () => {
    try {
      const response = await wompiService.getAcceptanceToken();
      if (response.success) {
        setAcceptanceToken(response.data.acceptanceToken);
        setAcceptancePermalink(response.data.permalink);
      } else {
        onError(response.error ?? new Error('No se pudo obtener el token de aceptación'));
      }
    } catch (error: unknown) {
      onError(error);
    }
  };

  // Manejar pago por enlace
  const handlePaymentLink = async () => {
    if (!acceptedTerms) {
      alert('Debes aceptar los términos y condiciones para continuar');
      return;
    }

    setLoading(true);
    try {
      const response = await wompiService.createPaymentLink({ orderId });
      
      if (response.success) {
        // Abrir el enlace de pago en una nueva ventana
        window.open(response.data.paymentUrl, '_blank');
        onSuccess(response.data);
      } else {
        onError(response.error);
      }
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Validar datos de tarjeta
  const validateCardData = () => {
    const errors = {
      number: '',
      cvc: '',
      expMonth: '',
      expYear: '',
      holderName: ''
    };

    // Validar número de tarjeta
    if (!cardData.number) {
      errors.number = 'El número de tarjeta es requerido';
    } else if (!wompiService.validateCardNumber(cardData.number)) {
      errors.number = 'Número de tarjeta inválido';
    }

    // Validar CVC
    if (!cardData.cvc) {
      errors.cvc = 'El CVC es requerido';
    } else if (!wompiService.validateCvc(cardData.cvc)) {
      errors.cvc = 'CVC inválido';
    }

    // Validar mes
    if (!cardData.expMonth) {
      errors.expMonth = 'El mes es requerido';
    }

    // Validar año
    if (!cardData.expYear) {
      errors.expYear = 'El año es requerido';
    }

    // Validar fecha de expiración
    if (cardData.expMonth && cardData.expYear) {
      if (!wompiService.validateExpiryDate(cardData.expMonth, cardData.expYear)) {
        errors.expMonth = 'Fecha de expiración inválida';
        errors.expYear = 'Fecha de expiración inválida';
      }
    }

    // Validar nombre del titular
    if (!cardData.holderName.trim()) {
      errors.holderName = 'El nombre del titular es requerido';
    }

    setCardErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  // Manejar pago con tarjeta
  const handleCardPayment = async () => {
    if (!acceptedTerms) {
      alert('Debes aceptar los términos y condiciones para continuar');
      return;
    }

    if (!validateCardData()) {
      return;
    }

    setLoading(true);
    try {
      // Primero tokenizar la tarjeta
      const tokenResponse = await wompiService.tokenizeCard(cardData);
      
      if (!tokenResponse.success) {
        onError(tokenResponse.error);
        return;
      }

      // Luego crear la transacción
      const transactionResponse = await wompiService.createCardTransaction({
        orderId,
        cardToken: tokenResponse.data.data.id,
        acceptanceToken
      });

      if (transactionResponse.success) {
        onSuccess(transactionResponse.data);
      } else {
        onError(transactionResponse.error);
      }
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en los datos de tarjeta
  const handleCardDataChange = (field: string, value: string) => {
    let processedValue = value;

    // Formatear número de tarjeta
    if (field === 'number') {
      processedValue = wompiService.formatCardNumber(value);
    }

    // Limitar longitud de CVC
    if (field === 'cvc') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    // Formatear mes (01, 02, etc.)
    if (field === 'expMonth') {
      processedValue = value.replace(/\D/g, '').slice(0, 2);
      if (processedValue.length === 1 && parseInt(processedValue) > 1) {
        processedValue = '0' + processedValue;
      }
    }

    // Formatear año (24, 25, etc.)
    if (field === 'expYear') {
      processedValue = value.replace(/\D/g, '').slice(0, 2);
    }

    setCardData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Limpiar error del campo
    if (cardErrors[field as keyof typeof cardErrors]) {
      setCardErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const paymentMethods: PaymentMethod[] = [
    {
      type: 'link',
      name: 'Enlace de Pago',
      description: 'Paga con PSE, Nequi, tarjetas o otros métodos'
    },
    {
      type: 'card',
      name: 'Tarjeta de Crédito',
      description: 'Paga directamente con tu tarjeta'
    }
  ];

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Procesar Pago</h2>
      
      <div className="mb-6">
        <p className="text-lg text-gray-600 mb-2">Total a pagar:</p>
        <p className="text-3xl font-bold text-green-600">
          ${amount.toLocaleString('es-CO')} COP
        </p>
      </div>

      {/* Selector de método de pago */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Método de pago
        </label>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.type}
              className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.type}
                checked={paymentMethod === method.type}
                onChange={(e) => setPaymentMethod(e.target.value as 'link' | 'card')}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-800">{method.name}</div>
                <div className="text-sm text-gray-500">{method.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Formulario de tarjeta (solo si se selecciona pago con tarjeta) */}
      {paymentMethod === 'card' && (
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de tarjeta
            </label>
            <input
              type="text"
              value={cardData.number}
              onChange={(e) => handleCardDataChange('number', e.target.value)}
              placeholder="1234 5678 9012 3456"
              className={`w-full px-3 py-2 border rounded-md ${
                cardErrors.number ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={19}
            />
            {cardErrors.number && (
              <p className="text-red-500 text-sm mt-1">{cardErrors.number}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
              <input
                type="text"
                value={cardData.expMonth}
                onChange={(e) => handleCardDataChange('expMonth', e.target.value)}
                placeholder="MM"
                className={`w-full px-3 py-2 border rounded-md ${
                  cardErrors.expMonth ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={2}
              />
              {cardErrors.expMonth && (
                <p className="text-red-500 text-xs mt-1">{cardErrors.expMonth}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                type="text"
                value={cardData.expYear}
                onChange={(e) => handleCardDataChange('expYear', e.target.value)}
                placeholder="AA"
                className={`w-full px-3 py-2 border rounded-md ${
                  cardErrors.expYear ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={2}
              />
              {cardErrors.expYear && (
                <p className="text-red-500 text-xs mt-1">{cardErrors.expYear}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVC
              </label>
              <input
                type="text"
                value={cardData.cvc}
                onChange={(e) => handleCardDataChange('cvc', e.target.value)}
                placeholder="123"
                className={`w-full px-3 py-2 border rounded-md ${
                  cardErrors.cvc ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={4}
              />
              {cardErrors.cvc && (
                <p className="text-red-500 text-xs mt-1">{cardErrors.cvc}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del titular
            </label>
            <input
              type="text"
              value={cardData.holderName}
              onChange={(e) => handleCardDataChange('holderName', e.target.value)}
              placeholder="Juan Pérez"
              className={`w-full px-3 py-2 border rounded-md ${
                cardErrors.holderName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {cardErrors.holderName && (
              <p className="text-red-500 text-sm mt-1">{cardErrors.holderName}</p>
            )}
          </div>
        </div>
      )}

      {/* Términos y condiciones */}
      <div className="mb-6">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 mr-2"
          />
          <span className="text-sm text-gray-600">
            Acepto los{' '}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-blue-600 hover:underline"
            >
              términos y condiciones
            </button>{' '}
            de Wompi y autorizo el procesamiento de mis datos
          </span>
        </label>
      </div>

      {/* Botones de acción */}
      <div className="space-y-3">
        <button
          onClick={paymentMethod === 'link' ? handlePaymentLink : handleCardPayment}
          disabled={loading || !acceptedTerms}
          className={`w-full py-3 px-4 rounded-md font-medium ${
            loading || !acceptedTerms
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white transition-colors`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando...
            </span>
          ) : (
            `Pagar ${paymentMethod === 'link' ? 'con Enlace' : 'con Tarjeta'}`
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full py-3 px-4 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Modal de términos y condiciones */}
      {showTerms && acceptancePermalink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Términos y Condiciones</h3>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <iframe
              src={acceptancePermalink}
              className="w-full h-64 border"
              title="Términos y Condiciones Wompi"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información de seguridad */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          🔒 Pago seguro procesado por Wompi
        </p>
      </div>
    </div>
  );
};

export default WompiPayment;
