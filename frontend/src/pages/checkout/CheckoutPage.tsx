import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNotificationCard } from '../../hooks/useNotificationCard';
import addressService from '../../services/addressService';
import { cartService } from '../../services/cartService';
import orderService from '../../services/orderService';
import wompiService from '../../services/wompiService';
import { useAuthStore } from '../../stores/authStore';
import { Address, Cart, DeliveryType, OrderForm } from '../../types';
import { getCiudadesPorDepartamento, getDepartamentos } from '../../utils/colombiaData';

const CheckoutPageOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotificationCard();
  const { user } = useAuthStore();
  
  // Estados principales
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicilio');
  const [updatingDeliveryType, setUpdatingDeliveryType] = useState(false);

  // Estados para el formulario
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [comments, setComments] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({
    _id: '',
    alias: 'nueva',
    nombreDestinatario: '',
    telefono: '',
    direccion: {
      calle: '',
      numero: '',
      apartamento: '',
      barrio: '',
      ciudad: '',
      departamento: '',
      codigoPostal: '',
      pais: 'Colombia'
    },
    tipo: 'casa',
    instruccionesEntrega: '',
    configuracion: {
      esPredeterminada: false,
      esFacturacion: false,
      esEnvio: true,
      activa: true
    },
    direccionCompleta: '',
    estadisticas: {
      vecesUsada: 0,
      entregasExitosas: 0,
      entregasFallidas: 0
    }
  });

  // Estados para método de pago
  const [paymentMethod] = useState<'wompi'>('wompi');
  
  // Estados para selectores de ubicación
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [otraCiudad, setOtraCiudad] = useState('');
  const departamentos = getDepartamentos();
  const isStorePickup = deliveryType === 'recoger_establecimiento';

  // Actualizar ciudades disponibles cuando cambie el departamento
  useEffect(() => {
    if (newAddress.direccion.departamento) {
      const ciudades = getCiudadesPorDepartamento(newAddress.direccion.departamento);
      setCiudadesDisponibles(ciudades);
      
      // Si la ciudad actual no está en la nueva lista, limpiarla
      if (!ciudades.includes(newAddress.direccion.ciudad) && newAddress.direccion.ciudad !== 'Otra') {
        setNewAddress(prev => ({
          ...prev,
          direccion: {
            ...prev.direccion,
            ciudad: ''
          }
        }));
        setOtraCiudad('');
      }
    } else {
      setCiudadesDisponibles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAddress.direccion.departamento]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Recalcular carrito para asegurar que tiene los valores actualizados (ej: costo de envío)
      try {
        await cartService.recalculateCart();
      } catch (recalcError) {
        console.warn('⚠️ Error recalculando carrito, continuando de todas formas:', recalcError);
      }
      
      // Cargar carrito
      const cartData = await cartService.getCart();
      if (!cartData || !cartData.productos || cartData.productos.length === 0) {
        showError('Tu carrito está vacío', 'Agrega productos antes de proceder al checkout');
        navigate('/cart');
        return;
      }
      setCart(cartData);
      setDeliveryType(cartData.tipoEntrega || 'domicilio');

      // Cargar direcciones
      const addressesData = await addressService.getAddresses();
      setAddresses(addressesData || []);
      
      // Auto-seleccionar dirección predeterminada
      const defaultAddress = addressesData.find((addr: any) => addr.configuracion?.esPredeterminada);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress._id);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Error al cargar los datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeliveryTypeChange = async (tipoEntrega: DeliveryType) => {
    if (tipoEntrega === deliveryType) {
      return;
    }

    try {
      setUpdatingDeliveryType(true);
      const updatedCart = await cartService.updateDeliveryType(tipoEntrega);
      setCart(updatedCart);
      setDeliveryType(updatedCart.tipoEntrega || tipoEntrega);
      setError('');
    } catch (deliveryError: any) {
      setError(deliveryError.message || 'No se pudo actualizar el tipo de entrega');
    } finally {
      setUpdatingDeliveryType(false);
    }
  };

  const validateForm = (): boolean => {
    setError('');

    // Validar dirección
    if (!isStorePickup && !useNewAddress && !selectedAddress) {
      setError('Selecciona una dirección de entrega');
      return false;
    }

    if (!isStorePickup && useNewAddress) {
      if (!newAddress.nombreDestinatario || !newAddress.telefono || 
          !newAddress.direccion.calle || !newAddress.direccion.ciudad ||
          !newAddress.direccion.departamento) {
        setError('Completa todos los campos obligatorios de la dirección');
        return false;
      }
      
      // Validar campo "Otra" ciudad
      if (newAddress.direccion.ciudad === 'Otra' && !otraCiudad.trim()) {
        setError('Debes especificar el nombre de la ciudad');
        return false;
      }
    }

    // Validar términos y condiciones
    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones');
      return false;
    }

    return true;
  };

  const handleCreateOrder = async (): Promise<string | null> => {
    try {
      setProcessingPayment(true);
      setError('');
      
      // Preparar dirección final (usar ciudad escrita si seleccionó "Otra")
      const finalAddress = isStorePickup
        ? null
        : useNewAddress
          ? {
              ...newAddress,
              direccion: {
                ...newAddress.direccion,
                ciudad: newAddress.direccion.ciudad === 'Otra' ? otraCiudad : newAddress.direccion.ciudad
              }
            }
          : selectedAddress;

      // Preparar datos de la orden
      const orderData: OrderForm = {
        productos: cart!.productos.map(item => ({
          producto: item.producto._id,
          cantidad: item.cantidad,
          precio: item.producto.precio,
          comerciante: typeof item.producto.comerciante === 'string' 
            ? item.producto.comerciante 
            : item.producto.comerciante._id
        })),
        direccionEntrega: finalAddress,
        tipoEntrega: deliveryType,
        metodoPago: {
          tipo: paymentMethod,
          datos: {}
        },
        usarDireccionGuardada: !isStorePickup && !useNewAddress,
        comentarios: comments
      };

      console.log('🚀 Creating order with data:', orderData);

      // Crear la orden
      const response = await orderService.createOrder(orderData);
      
      console.log('📦 Order service response:', response);
      
      if (!response || !response._id) {
        console.error('❌ Invalid order response:', response);
        throw new Error('Error al crear la orden: respuesta inválida del servidor');
      }

      console.log('✅ Order created successfully:', response._id);
      return response._id;

    } catch (error: any) {
      console.error('❌ Error creating order:', error);
      setError(error.message || 'Error al procesar la orden');
      return null;
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleWompiPayment = async () => {
    try {
      console.log('🎯 Starting Wompi payment process...');
      
      // Validar monto mínimo para Wompi (1,500 COP)
      const minimumAmount = 1500;
      if (!cart?.total || cart.total < minimumAmount) {
        showError(
          'Monto insuficiente', 
          `El monto mínimo para pagos con Wompi es $${minimumAmount.toLocaleString()} COP. Tu carrito tiene $${(cart?.total || 0).toLocaleString()} COP.`
        );
        return;
      }
      
      // Primero crear la orden
      const orderId = await handleCreateOrder();
      if (!orderId) {
        console.error('❌ No order ID received');
        return;
      }

      console.log('✅ Order created, ID:', orderId);
      setProcessingPayment(true);
      
      // Obtener la dirección correcta
      let address: Address | null = null;
      
      if (!isStorePickup && useNewAddress) {
        // Usar ciudad personalizada si seleccionó "Otra"
        address = {
          ...newAddress,
          direccion: {
            ...newAddress.direccion,
            ciudad: newAddress.direccion.ciudad === 'Otra' ? otraCiudad : newAddress.direccion.ciudad
          }
        };
        console.log('📍 Using new address:', address);
      } else if (!isStorePickup) {
        // Buscar la dirección seleccionada en el array de direcciones
        const foundAddress = addresses.find(addr => addr._id === selectedAddress);
        if (!foundAddress) {
          throw new Error('No se ha seleccionado una dirección válida');
        }
        address = foundAddress;
        console.log('📍 Using saved address:', address);
      }

      // Validar que tenemos los datos mínimos
      const customerFullName = address?.nombreDestinatario || user?.nombre || 'Cliente Comercializadora SPG';
      const customerPhone = address?.telefono || user?.telefono || '3000000000';

      if (!customerFullName || !customerPhone) {
        throw new Error('Los datos de la dirección están incompletos');
      }

      console.log('💰 Cart total:', cart?.total);
      console.log('👤 User data:', { email: user?.email, name: user?.nombre });

      const paymentData = {
        orderId: orderId,
        amount: cart?.total || 0,
        currency: 'COP',
        customerData: {
          fullName: customerFullName,
          email: user?.email || '',
          phoneNumber: customerPhone,
          legalId: '12345678', // Placeholder - se puede extender el tipo User si se necesita
          legalIdType: 'CC'
        },
        ...(isStorePickup || !address ? {} : {
          shippingAddress: {
            addressLine1: address.direccion.calle,
            city: address.direccion.ciudad,
            phoneNumber: address.telefono,
            region: address.direccion.departamento,
            postalCode: address.direccion.codigoPostal || '110111'
          }
        })
      };
      
      // Crear enlace de pago de Wompi
      console.log('🔗 Creating Wompi payment link for order:', orderId);
      console.log('📊 Payment data:', paymentData);
      
      const paymentResult = await wompiService.createPaymentLink(paymentData);
      
      console.log('💳 Payment result received:', JSON.stringify(paymentResult, null, 2));
      
      if (paymentResult.success && paymentResult.data?.paymentUrl) {
        console.log('✅ Payment link created, redirecting to:', paymentResult.data.paymentUrl);
        
        // Limpiar carrito
        await cartService.clearCart();
        
        // Mostrar mensaje de éxito
        showSuccess('Redirigiendo a Wompi', 'Te redirigiremos a la página de pago segura en unos momentos...');
        
        // Redirigir a Wompi después de un breve delay
        setTimeout(() => {
          window.location.href = paymentResult.data.paymentUrl;
        }, 2000);
      } else {
        console.error('❌ Payment result error details:', JSON.stringify({
          success: paymentResult.success,
          error: paymentResult.error,
          data: paymentResult.data,
          message: paymentResult.message,
          fullObject: paymentResult
        }, null, 2));
        
        const errorMsg = paymentResult.error 
          ? wompiService.getErrorMessage(paymentResult.error)
          : paymentResult.message || 'Error desconocido al crear enlace de pago';
        
        setError(`Error al crear enlace de pago: ${errorMsg}`);
        console.error('❌ Failed to create payment link:', paymentResult.error);
      }

    } catch (error: any) {
      console.error('💥 Exception in Wompi payment:', error);
      setError(error.message || 'Error al procesar el pago con Wompi');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateForm()) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePayment = () => {
    if (!validateForm()) return;
    
    // Todos los métodos de pago usan Wompi
    handleWompiPayment();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando información del checkout...</p>
        </div>
      </div>
    );
  }

  if (!cart || !cart.productos || cart.productos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Carrito vacío</h2>
          <p className="text-gray-600 mb-6">No tienes productos en tu carrito</p>
          <button
            onClick={() => navigate('/products')}
            className="btn-primary"
          >
            Ir a productos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
          <p className="text-gray-600 mt-2">Completa tu pedido de forma segura con Wompi</p>
          <div className="mt-2 text-sm text-gray-500">
            🔒 Pago 100% seguro • ✅ Certificado SSL • 💳 Múltiples métodos de pago
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                {currentStep > 1 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  '1'
                )}
              </div>
              <div className={`h-1 w-20 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                2
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-3">
            <div className="flex space-x-20 text-sm font-medium">
              <span className={currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}>
                Entrega
              </span>
              <span className={currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}>
                Método de pago
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario principal */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg p-6">
              
              {/* Paso 1: Dirección de entrega */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Método de entrega
                  </h2>

                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleDeliveryTypeChange('domicilio')}
                      disabled={updatingDeliveryType}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        deliveryType === 'domicilio'
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${updatingDeliveryType ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <p className="font-semibold text-gray-900 mb-1">Envío a domicilio</p>
                      <p className="text-sm text-gray-600">Recibe tu pedido en la dirección que selecciones.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeliveryTypeChange('recoger_establecimiento')}
                      disabled={updatingDeliveryType}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        deliveryType === 'recoger_establecimiento'
                          ? 'border-green-600 bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${updatingDeliveryType ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <p className="font-semibold text-gray-900 mb-1">Recoger en establecimiento</p>
                      <p className="text-sm text-gray-600">El envío no se cobra y coordinaremos la recogida contigo.</p>
                    </button>
                  </div>

                  {/* Direcciones guardadas */}
                  {!isStorePickup && addresses.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Direcciones guardadas
                      </h3>
                      <div className="space-y-3">
                        {addresses.map((address) => (
                          <div
                            key={address._id}
                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedAddress === address._id && !useNewAddress
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                            }`}
                            onClick={() => {
                              setSelectedAddress(address._id);
                              setUseNewAddress(false);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-1">
                                  <p className="font-medium text-gray-900">{address.nombreDestinatario}</p>
                                  {address.configuracion?.esPredeterminada && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Predeterminada
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-1">📞 {address.telefono}</p>
                                <p className="text-sm text-gray-600">
                                  📍 {address.direccion.calle}, {address.direccion.ciudad}, {address.direccion.departamento}
                                </p>
                                {address.instruccionesEntrega && (
                                  <p className="text-sm text-gray-500 mt-2 italic">💬 {address.instruccionesEntrega}</p>
                                )}
                              </div>
                              {selectedAddress === address._id && !useNewAddress && (
                                <div className="flex-shrink-0 ml-3">
                                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Usar nueva dirección */}
                  {!isStorePickup && (
                  <div className="mb-6">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={useNewAddress}
                        onChange={(e) => setUseNewAddress(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-3 text-gray-900 font-medium">
                        ➕ Usar una nueva dirección
                      </span>
                    </label>
                  </div>
                  )}

                  {/* Formulario nueva dirección */}
                  {!isStorePickup && useNewAddress && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Nueva dirección de entrega</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre completo *
                          </label>
                          <input
                            type="text"
                            value={newAddress.nombreDestinatario}
                            onChange={(e) => setNewAddress(prev => ({
                              ...prev,
                              nombreDestinatario: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: Juan Pérez"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono *
                          </label>
                          <input
                            type="tel"
                            value={newAddress.telefono}
                            onChange={(e) => setNewAddress(prev => ({
                              ...prev,
                              telefono: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: 300 123 4567"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección completa *
                          </label>
                          <input
                            type="text"
                            value={newAddress.direccion.calle}
                            onChange={(e) => setNewAddress(prev => ({
                              ...prev,
                              direccion: { ...prev.direccion, calle: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: Calle 123 #45-67, Apt 101"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Departamento *
                          </label>
                          <select
                            value={newAddress.direccion.departamento}
                            onChange={(e) => setNewAddress(prev => ({
                              ...prev,
                              direccion: { ...prev.direccion, departamento: e.target.value, ciudad: '' }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Seleccionar departamento</option>
                            {departamentos.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ciudad *
                          </label>
                          <select
                            value={newAddress.direccion.ciudad}
                            onChange={(e) => {
                              setNewAddress(prev => ({
                                ...prev,
                                direccion: { ...prev.direccion, ciudad: e.target.value }
                              }));
                              if (e.target.value !== 'Otra') {
                                setOtraCiudad('');
                              }
                            }}
                            disabled={!newAddress.direccion.departamento}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            required
                          >
                            <option value="">Seleccionar ciudad</option>
                            {ciudadesDisponibles.map(ciudad => (
                              <option key={ciudad} value={ciudad}>{ciudad}</option>
                            ))}
                          </select>
                        </div>
                        {newAddress.direccion.ciudad === 'Otra' && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nombre de la ciudad *
                            </label>
                            <input
                              type="text"
                              value={otraCiudad}
                              onChange={(e) => setOtraCiudad(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Escriba el nombre de la ciudad"
                              required
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isStorePickup && (
                    <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                      <h3 className="text-lg font-medium text-green-900 mb-2">Recogida en establecimiento</h3>
                      <p className="text-sm text-green-800">
                        Tu pedido quedará listo para recoger y te contactaremos para coordinar el retiro. No necesitas registrar una dirección y el envío queda en $0.
                      </p>
                    </div>
                  )}

                  {/* Comentarios */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comentarios adicionales (opcional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={isStorePickup
                        ? 'Indicaciones para coordinar la recogida, horario preferido, etc.'
                        : 'Instrucciones especiales para la entrega, punto de referencia, etc.'}
                    />
                  </div>

                  {/* Términos y condiciones */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        Acepto los{' '}
                        <a href="/terminos" target="_blank" className="text-blue-600 hover:underline font-medium">
                          términos y condiciones
                        </a>{' '}
                        y{' '}
                        <a href="/privacidad" target="_blank" className="text-blue-600 hover:underline font-medium">
                          política de privacidad
                        </a>{' '}
                        de AndinoExpress
                      </span>
                    </label>
                  </div>

                  {/* Botón siguiente */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleNextStep}
                      disabled={!acceptedTerms}
                      className={`btn-primary flex items-center ${
                        !acceptedTerms ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span>Continuar al pago</span>
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 2: Método de pago */}
              {currentStep === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Método de pago
                    </h2>
                    <button
                      onClick={handlePreviousStep}
                      className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Volver
                    </button>
                  </div>

                  {/* Opciones de pago con Wompi */}
                  <div className="space-y-4 mb-6">
                    {/* Enlace de pago Wompi - Todos los métodos */}
                    <div className="p-6 border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-xl font-bold text-gray-900">💳 Wompi</h3>
                            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white animate-pulse">
                              ⭐ Recomendado
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium mb-3">
                            Todos los métodos de pago disponibles
                          </p>
                          <p className="text-sm text-gray-600 mb-4">
                            PSE, Nequi, Daviplata, tarjetas de crédito/débito, Efecty y más opciones seguras
                          </p>
                          <div className="flex items-center space-x-3 text-sm">
                            <span className="flex items-center text-blue-700 font-medium">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              🎯 Múltiples opciones
                            </span>
                            <span className="flex items-center text-purple-700 font-medium">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              🚀 Rápido y seguro
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información de seguridad */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          🔒 Pago 100% seguro con Wompi
                        </h3>
                        <div className="mt-2 text-sm text-green-700 space-y-1">
                          <p>✅ Conexión encriptada SSL/TLS de nivel bancario</p>
                          <p>✅ No almacenamos datos de tarjetas en nuestros servidores</p>
                          <p>✅ Procesamiento PCI DSS certificado</p>
                          <p>✅ Certificado por la Superintendencia Financiera de Colombia</p>
                          <p>✅ Monitoreo 24/7 contra fraudes</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información del proceso */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona el proceso de pago?</h4>
                        <div className="text-sm text-blue-800 space-y-1 mb-3">
                          <p>1️⃣ Al hacer clic en "Pagar", serás redirigido a la plataforma segura de Wompi</p>
                          <p>2️⃣ Elige tu método de pago preferido (PSE, Nequi, tarjeta, etc.)</p>
                          <p>3️⃣ Completa el pago siguiendo las instrucciones</p>
                          <p>4️⃣ Regresarás automáticamente con la confirmación</p>
                          <p>5️⃣ Recibirás tu comprobante por email</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                          <p className="font-semibold text-green-900 mb-2">🔒 Pago Seguro con Wompi</p>
                          <div className="text-xs text-green-800 space-y-1">
                            <p><strong>✅ Métodos de pago disponibles:</strong></p>
                            <p>• 💳 Tarjetas de crédito y débito (Visa, Mastercard)</p>
                            <p>• 🏦 PSE - Transferencia bancaria</p>
                            <p>• 📱 Nequi - Pago desde tu celular</p>
                            <p className="text-xs text-green-700 mt-2 italic font-semibold">
                              🔐 Todos tus datos están protegidos con encriptación de última generación.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón de pago */}
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={handlePayment}
                        disabled={processingPayment}
                        className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-lg px-8 py-3"
                      >
                        {processingPayment ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">Procesando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Pagar ${cart.total.toLocaleString('es-CO')}</span>
                            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Indicador de estado del pago */}
                    {processingPayment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                          <div>
                            <p className="text-blue-800 font-medium">🔄 Procesando tu pago...</p>
                            <p className="text-blue-600 text-sm">
                              Te redirigiremos a la plataforma de pago segura de Wompi en unos momentos. 
                              No cierres esta ventana.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Resumen del pedido
              </h3>
              
              {/* Productos */}
              <div className="space-y-3 mb-4">
                {cart.productos.map((item, index) => (
                  <div key={`${item.producto._id}-${index}`} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-2">{item.producto.nombre}</p>
                      <p className="text-gray-600">Cantidad: {item.cantidad}</p>
                      <p className="text-xs text-gray-500">
                        ${item.precio.toLocaleString('es-CO')} c/u
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-medium text-gray-900">
                        ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="my-4" />

              {/* Totales */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${cart.subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío:</span>
                  <span className="font-medium">{cart.costoEnvio === 0 ? 'Gratis' : `$${cart.costoEnvio.toLocaleString('es-CO')}`}</span>
                </div>
                {cart.descuentos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Descuento:</span>
                    <span className="font-medium text-green-600">-${cart.descuentos.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-blue-600">${cart.total.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Dirección seleccionada */}
              {currentStep === 2 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    Entrega:
                  </h4>
                  {isStorePickup ? (
                    <div className="text-sm text-green-700 space-y-1">
                      <p className="font-medium">Recoger en establecimiento</p>
                      <p>🏬 No se cobra envío.</p>
                      <p>Te contactaremos para coordinar la recogida.</p>
                    </div>
                  ) : useNewAddress ? (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium">{newAddress.nombreDestinatario}</p>
                      <p>📞 {newAddress.telefono}</p>
                      <p>📍 {newAddress.direccion.calle}</p>
                      <p>{newAddress.direccion.ciudad}, {newAddress.direccion.departamento}</p>
                    </div>
                  ) : (
                    selectedAddress && addresses.find(addr => addr._id === selectedAddress) && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {(() => {
                          const addr = addresses.find(a => a._id === selectedAddress)!;
                          return (
                            <>
                              <p className="font-medium">{addr.nombreDestinatario}</p>
                              <p>📞 {addr.telefono}</p>
                              <p>📍 {addr.direccion.calle}</p>
                              <p>{addr.direccion.ciudad}, {addr.direccion.departamento}</p>
                            </>
                          );
                        })()}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Método de pago seleccionado */}
              {currentStep === 2 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Método de pago:
                  </h4>
                  <div className="text-sm text-gray-600">
                    💳 Wompi - Todos los métodos disponibles
                  </div>
                </div>
              )}

              {/* Badge de seguridad */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-green-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-xs text-green-800 font-medium">Pago Seguro</p>
                    <p className="text-xs text-green-600">SSL Certificado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPageOptimized;
