import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import type { Address, Cart, CartItem, DeliveryType, OrderForm } from '../../types';
import { cartService } from '../../services/cartService';
import { addressService } from '../../services/addressService';
import { orderService } from '../../services/orderService';
import wompiService from '../../services/wompiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Container } from '../../components/ui/Container';
import { useNotifications } from '../../components/ui/NotificationContainer';
import { useAuthStore } from '../../stores/authStore';
import { BRAND_NAME } from '../../components/nav/navData';
import { getDepartamentos, getCiudadesPorDepartamento } from '../../utils/colombiaData';
import { queryKeys } from '../../lib/query/queryKeys';
import { getApiErrorMessage } from '../../lib/apiErrors';
import { resolveCartProductId } from '../../lib/cartLineUtils';
import { useCartStore } from '../../stores/cartStore';
import {
  BuildingStorefrontIcon,
  CheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const CHECKOUT_DRAFT_KEY = 'spg_checkout_draft_v1';
const PICKUP_LOCATION = {
  name: 'Comercializadora SPG',
  address: 'Pasto, Nariño',
  instructions: 'Te avisaremos cuando el pedido esté listo. Lleva tu documento y el número de orden.',
  schedule: 'Lunes a sábado · coordinación previa',
  contact: 'Confirmación por teléfono o correo'
};

type CheckoutFormValues = {
  deliveryType: DeliveryType;
  selectedAddress: string;
  useNewAddress: boolean;
  comments: string;
  acceptedTerms: boolean;
  payerDocument: string;
  otraCiudad: string;
  newAddress: Address;
};

const createEmptyAddress = (): Address => ({
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

const checkoutResolver: Resolver<CheckoutFormValues> = async (values) => {
  const errors: Record<string, any> = {};
  const isPickup = values.deliveryType === 'recoger_establecimiento';

  if (!isPickup && !values.useNewAddress && !values.selectedAddress) {
    errors.selectedAddress = {
      type: 'required',
      message: 'Selecciona una dirección de entrega'
    };
  }

  if (!isPickup && values.useNewAddress) {
    const address = values.newAddress;
    const fieldErrors: Record<string, any> = {};
    if (!address.nombreDestinatario?.trim()) {
      fieldErrors.nombreDestinatario = { type: 'required', message: 'Indica el nombre del destinatario' };
    }
    if (!address.telefono?.trim()) {
      fieldErrors.telefono = { type: 'required', message: 'Indica un teléfono de contacto' };
    }
    if (!address.direccion?.calle?.trim()) {
      fieldErrors.direccion = {
        ...(fieldErrors.direccion || {}),
        calle: { type: 'required', message: 'Indica la dirección completa' }
      };
    }
    if (!address.direccion?.departamento?.trim()) {
      fieldErrors.direccion = {
        ...(fieldErrors.direccion || {}),
        departamento: { type: 'required', message: 'Selecciona el departamento' }
      };
    }
    if (!address.direccion?.ciudad?.trim()) {
      fieldErrors.direccion = {
        ...(fieldErrors.direccion || {}),
        ciudad: { type: 'required', message: 'Selecciona la ciudad' }
      };
    }
    if (address.direccion?.ciudad === 'Otra' && !values.otraCiudad.trim()) {
      errors.otraCiudad = { type: 'required', message: 'Debes especificar el nombre de la ciudad' };
    }
    if (Object.keys(fieldErrors).length > 0) {
      errors.newAddress = fieldErrors;
    }
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = {
      type: 'required',
      message: 'Debes aceptar los términos y condiciones'
    };
  }

  return {
    values: Object.keys(errors).length ? {} as CheckoutFormValues : values,
    errors
  };
};

const getFirstValidationMessage = (errors: Record<string, any>): string => {
  if (errors.selectedAddress?.message) return errors.selectedAddress.message;
  if (errors.acceptedTerms?.message) return errors.acceptedTerms.message;
  if (errors.otraCiudad?.message) return errors.otraCiudad.message;
  const addressErrors = errors.newAddress;
  return (
    addressErrors?.nombreDestinatario?.message ||
    addressErrors?.telefono?.message ||
    addressErrors?.direccion?.calle?.message ||
    addressErrors?.direccion?.departamento?.message ||
    addressErrors?.direccion?.ciudad?.message ||
    'Revisa los campos obligatorios antes de continuar'
  );
};

const CheckoutPageOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotifications();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const idempotencyKeyRef = useRef<string | null>(null);
  const paymentSubmitLock = useRef(false);

  const getCheckoutIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }
    return idempotencyKeyRef.current;
  };

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
  const [newAddress, setNewAddress] = useState<Address>(() => createEmptyAddress());

  // Estados para método de pago
  const [paymentMethod] = useState<'wompi'>('wompi');
  const [payerDocument, setPayerDocument] = useState('');
  const [payerDocumentTouched, setPayerDocumentTouched] = useState(false);
  
  // Estados para selectores de ubicación
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [otraCiudad, setOtraCiudad] = useState('');
  const departamentos = getDepartamentos();
  const isStorePickup = deliveryType === 'recoger_establecimiento';
  const {
    control,
    setValue,
    trigger,
    clearErrors,
    resetField,
    getValues
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      deliveryType,
      selectedAddress,
      useNewAddress,
      comments,
      acceptedTerms,
      payerDocument,
      otraCiudad,
      newAddress
    },
    mode: 'onChange',
    resolver: checkoutResolver,
    shouldUnregister: false
  });
  const watchedDeliveryType = useWatch({ control, name: 'deliveryType' });

  useEffect(() => {
    setValue('deliveryType', deliveryType, { shouldValidate: false });
  }, [deliveryType, setValue]);

  useEffect(() => {
    setValue('selectedAddress', selectedAddress, { shouldValidate: false });
  }, [selectedAddress, setValue]);

  useEffect(() => {
    setValue('useNewAddress', useNewAddress, { shouldValidate: false });
  }, [useNewAddress, setValue]);

  useEffect(() => {
    setValue('newAddress', newAddress, { shouldValidate: false });
  }, [newAddress, setValue]);

  useEffect(() => {
    setValue('comments', comments, { shouldValidate: false });
  }, [comments, setValue]);

  useEffect(() => {
    setValue('acceptedTerms', acceptedTerms, { shouldValidate: false });
  }, [acceptedTerms, setValue]);

  useEffect(() => {
    setValue('payerDocument', payerDocument.replace(/\D/g, ''), { shouldValidate: false });
  }, [payerDocument, setValue]);

  useEffect(() => {
    setValue('otraCiudad', otraCiudad, { shouldValidate: false });
  }, [otraCiudad, setValue]);

  useEffect(() => {
    if (watchedDeliveryType === 'recoger_establecimiento') {
      clearErrors(['selectedAddress', 'newAddress', 'otraCiudad']);
    }
  }, [clearErrors, watchedDeliveryType]);

  // Actualizar ciudades disponibles cuando cambie el departamento
  useEffect(() => {
    if (newAddress.direccion.departamento) {
      const ciudades = getCiudadesPorDepartamento(newAddress.direccion.departamento);
      setCiudadesDisponibles(ciudades);
      
      // Si la ciudad actual no está en la nueva lista, limpiarla
      if (!ciudades.includes(newAddress.direccion.ciudad) && newAddress.direccion.ciudad !== 'Otra') {
        setNewAddress((prev: Address) => ({
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

  useEffect(() => {
    const doc = user?.numeroDocumento;
    if (doc) {
      setPayerDocument(String(doc).replace(/\D/g, ''));
    }
  }, [user?.numeroDocumento]);

  useEffect(() => {
    if (loading || !cart?.productos?.length) return;
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        savedAt?: number;
        step?: number;
        deliveryType?: DeliveryType;
        selectedAddress?: string;
        useNewAddress?: boolean;
        comments?: string;
        acceptedTerms?: boolean;
        payerDocument?: string;
      };
      if (!d.savedAt || Date.now() - d.savedAt > 3600000) {
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        return;
      }
      if (typeof d.step === 'number' && d.step >= 1 && d.step <= 2) setCurrentStep(d.step);
      if (d.deliveryType === 'domicilio' || d.deliveryType === 'recoger_establecimiento') {
        setDeliveryType(d.deliveryType);
        setValue('deliveryType', d.deliveryType, { shouldValidate: false });
      }
      if (d.selectedAddress) setSelectedAddress(d.selectedAddress);
      if (typeof d.useNewAddress === 'boolean') setUseNewAddress(d.useNewAddress);
      if (typeof d.comments === 'string') setComments(d.comments);
      if (typeof d.acceptedTerms === 'boolean') setAcceptedTerms(d.acceptedTerms);
      if (d.payerDocument) setPayerDocument(d.payerDocument.replace(/\D/g, ''));
    } catch {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }
  }, [loading, cart?.productos?.length, setValue]);

  useEffect(() => {
    if (!cart?.productos?.length) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          CHECKOUT_DRAFT_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            step: currentStep,
            deliveryType,
            selectedAddress,
            useNewAddress,
            comments,
            acceptedTerms,
            payerDocument: payerDocument.replace(/\D/g, '')
          })
        );
      } catch {
        /* quota / private mode */
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [currentStep, deliveryType, selectedAddress, useNewAddress, comments, acceptedTerms, payerDocument, cart?.productos?.length]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Recalcular carrito para asegurar que tiene los valores actualizados (ej: costo de envío)
      try {
        await cartService.recalculateCart();
      } catch {
        // Recalcular es best-effort; seguimos con el carrito persistido.
      }
      
      // Cargar carrito
      const cartData = await cartService.getCart();
      if (!cartData || !cartData.productos || cartData.productos.length === 0) {
        showError('Tu carrito está vacío', 'Agrega productos antes de proceder al checkout');
        navigate('/carrito');
        return;
      }
      setCart(cartData);
      useCartStore.getState().syncCart(cartData);
      queryClient.setQueryData(queryKeys.cart.current(), cartData);
      setDeliveryType(cartData.tipoEntrega || 'domicilio');
      setValue('deliveryType', cartData.tipoEntrega || 'domicilio', { shouldValidate: false });

      // Cargar direcciones
      const addressesData = await addressService.getAddresses();
      setAddresses(addressesData || []);
      
      // Auto-seleccionar dirección predeterminada
      const defaultAddress = addressesData.find((addr: any) => addr.configuracion?.esPredeterminada);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress._id);
        setValue('selectedAddress', defaultAddress._id, { shouldValidate: false });
      }

    } catch (loadErr: unknown) {
      setError(getApiErrorMessage(loadErr, 'Error al cargar los datos iniciales'));
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
      const nextDeliveryType = updatedCart.tipoEntrega || tipoEntrega;
      setDeliveryType(nextDeliveryType);
      setValue('deliveryType', nextDeliveryType, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      if (nextDeliveryType === 'recoger_establecimiento') {
        setSelectedAddress('');
        setUseNewAddress(false);
        setOtraCiudad('');
        resetField('selectedAddress', { defaultValue: '' });
        resetField('useNewAddress', { defaultValue: false });
        resetField('otraCiudad', { defaultValue: '' });
        clearErrors(['selectedAddress', 'newAddress', 'otraCiudad']);
      }
      setError('');
    } catch (deliveryError: unknown) {
      setError(getApiErrorMessage(deliveryError, 'No se pudo actualizar el tipo de entrega'));
    } finally {
      setUpdatingDeliveryType(false);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    setError('');
    const valid = await trigger();
    if (!valid) {
      const validation = await checkoutResolver(getValues(), undefined as any, {} as any);
      setError(getFirstValidationMessage(validation.errors as Record<string, any>));
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
      const orderLines = cart!.productos.map((item: CartItem) => {
        const productoId = resolveCartProductId(item);
        if (!productoId) {
          throw new Error('Hay un producto en el carrito sin identificar. Actualiza el carrito e inténtalo de nuevo.');
        }
        return {
          producto: productoId,
          ...(item.variantId ? { variantId: String(item.variantId) } : {}),
          cantidad: Math.max(1, Math.floor(Number(item.cantidad)) || 1),
        };
      });

      const orderData: OrderForm = {
        productos: orderLines,
        direccionEntrega: finalAddress,
        tipoEntrega: deliveryType,
        deliveryMethod: isStorePickup ? 'pickup' : 'delivery',
        pickupLocation: isStorePickup ? PICKUP_LOCATION : undefined,
        metodoPago: {
          tipo: paymentMethod,
          datos: {}
        },
        usarDireccionGuardada: !isStorePickup && !useNewAddress,
        comentarios: comments
      };

      // Crear la orden
      const response = await orderService.createOrder(orderData, {
        idempotencyKey: getCheckoutIdempotencyKey()
      });
      
      if (!response || !response._id) {
        throw new Error('Error al crear la orden: respuesta inválida del servidor');
      }

      return response._id;

    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Error al procesar la orden'));
      return null;
    } finally {
      setProcessingPayment(false);
    }
  };

  const checkoutPaymentMutation = useMutation({
    mutationKey: ['checkout', 'wompi-payment'],
    retry: false,
    mutationFn: async () => {
      const minimumAmount = 1500;
      if (!cart?.total || cart.total < minimumAmount) {
        throw new Error(
          `El monto mínimo para pagos con Wompi es $${minimumAmount.toLocaleString()} COP. Tu carrito tiene $${(cart?.total || 0).toLocaleString()} COP.`
        );
      }

      const orderId = await handleCreateOrder();
      if (!orderId) {
        throw new Error('No se pudo crear la orden para iniciar el pago');
      }

      setProcessingPayment(true);

      let address: Address | null = null;
      if (!isStorePickup) {
        if (useNewAddress) {
          address = {
            ...newAddress,
            direccion: {
              ...newAddress.direccion,
              ciudad: newAddress.direccion.ciudad === 'Otra' ? otraCiudad : newAddress.direccion.ciudad
            }
          };
        } else {
          address = addresses.find((addr) => addr._id === selectedAddress) || null;
          if (!address) {
            throw new Error('No se ha seleccionado una dirección válida');
          }
        }

        if (!address.nombreDestinatario || !address.telefono || !address.direccion?.calle) {
          throw new Error('Los datos de la dirección están incompletos');
        }
      }

      const customerFullName = (
        user?.nombre?.trim() ||
        address?.nombreDestinatario ||
        'Cliente Comercializadora SPG'
      ).trim();
      const customerPhone = (
        isStorePickup
          ? user?.telefono || address?.telefono || '3000000000'
          : address?.telefono
      ) || '3000000000';

      const paymentData = {
        orderId,
        amount: cart.total,
        currency: 'COP',
        deliveryMethod: (isStorePickup ? 'pickup' : 'delivery') as 'pickup' | 'delivery',
        pickupLocation: isStorePickup ? PICKUP_LOCATION : undefined,
        customerData: {
          fullName: customerFullName,
          email: user?.email || '',
          phoneNumber: customerPhone,
          legalId: payerDocument.replace(/\D/g, ''),
          legalIdType: 'CC'
        },
        ...(!isStorePickup && address ? {
          shippingAddress: {
            addressLine1: address.direccion.calle,
            city: address.direccion.ciudad,
            phoneNumber: address.telefono,
            region: address.direccion.departamento,
            postalCode: address.direccion.codigoPostal || '110111'
          }
        } : {})
      };

      const paymentResult = await wompiService.createPaymentLink(paymentData);
      if (!paymentResult.success || !paymentResult.data?.paymentUrl) {
        const errorMsg = paymentResult.error
          ? wompiService.getErrorMessage(paymentResult.error)
          : paymentResult.message || 'Error desconocido al crear enlace de pago';
        throw new Error(`Error al crear enlace de pago: ${errorMsg}`);
      }

      return paymentResult.data.paymentUrl as string;
    },
    onSuccess: async (paymentUrl) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      ]);
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      showSuccess('Redirigiendo a Wompi', 'Te redirigiremos a la página de pago segura en unos momentos…');
      window.setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1200);
    },
    onError: (paymentError: unknown) => {
      const msg = paymentError instanceof Error ? paymentError.message : 'Error al procesar el pago con Wompi';
      setError(msg);
    },
    onSettled: () => {
      setProcessingPayment(false);
    }
  });

  const handleWompiPayment = async () => {
    if (paymentSubmitLock.current || processingPayment || checkoutPaymentMutation.isPending) {
      return;
    }
    paymentSubmitLock.current = true;
    try {
      await checkoutPaymentMutation.mutateAsync();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al procesar el pago con Wompi';
      setError(msg);
    } finally {
      paymentSubmitLock.current = false;
      setProcessingPayment(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1 && await validateForm()) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePayment = async () => {
    if (!await validateForm()) return;
    const digits = payerDocument.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 11) {
      setPayerDocumentTouched(true);
      setError('Indica un documento válido del pagador (6 a 11 dígitos) para continuar con Wompi.');
      return;
    }
    setError('');
    handleWompiPayment();
  };

  const isCheckoutBusy = processingPayment || checkoutPaymentMutation.isPending;

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
            onClick={() => navigate('/productos')}
            className="btn-primary"
          >
            Ir a productos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 pb-32 sm:py-8 sm:pb-36 lg:pb-8">
      <Container className="max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Checkout</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Pago seguro con Wompi · {BRAND_NAME}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Conexión cifrada. El resultado del pago se confirma en el servidor, no solo en el navegador.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 sm:gap-4">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold sm:h-9 sm:w-9 sm:text-sm ${
                  currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentStep > 1 ? <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden /> : '1'}
              </div>
              <div className={`h-px w-10 sm:w-16 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold sm:h-9 sm:w-9 sm:text-sm ${
                  currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                2
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-3 gap-8 sm:gap-24 text-xs sm:text-sm font-medium text-gray-600">
            <span className={currentStep >= 1 ? 'text-primary-700' : ''}>Entrega</span>
            <span className={currentStep >= 2 ? 'text-primary-700' : ''}>Pago</span>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          <div className="order-2 min-w-0 lg:order-1 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft sm:p-6">

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

                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleDeliveryTypeChange('domicilio')}
                      disabled={updatingDeliveryType}
                      aria-pressed={deliveryType === 'domicilio'}
                      className={`group rounded-2xl border p-5 text-left shadow-sm transition-all duration-200 ${
                        deliveryType === 'domicilio'
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md'
                      } ${updatingDeliveryType ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          deliveryType === 'domicilio' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <TruckIcon className="h-6 w-6" aria-hidden />
                        </div>
                        {deliveryType === 'domicilio' && (
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Activo</span>
                        )}
                      </div>
                      <p className="mb-1 font-semibold text-gray-900">Envío a domicilio</p>
                      <p className="text-sm leading-6 text-gray-600">Recibe tu pedido en una dirección guardada o nueva con validación completa.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeliveryTypeChange('recoger_establecimiento')}
                      disabled={updatingDeliveryType}
                      aria-pressed={deliveryType === 'recoger_establecimiento'}
                      className={`group rounded-2xl border p-5 text-left shadow-sm transition-all duration-200 ${
                        deliveryType === 'recoger_establecimiento'
                          ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                          : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md'
                      } ${updatingDeliveryType ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          deliveryType === 'recoger_establecimiento' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <BuildingStorefrontIcon className="h-6 w-6" aria-hidden />
                        </div>
                        {deliveryType === 'recoger_establecimiento' && (
                          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">Activo</span>
                        )}
                      </div>
                      <p className="mb-1 font-semibold text-gray-900">Recoger en ubicación</p>
                      <p className="text-sm leading-6 text-gray-600">Sin dirección de entrega, sin costo de envío y con coordinación directa.</p>
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
                                <p className="mb-1 flex items-center gap-1.5 text-sm text-gray-600">
                                  <PhoneIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                  {address.telefono}
                                </p>
                                <p className="flex items-start gap-1.5 text-sm text-gray-600">
                                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                  <span>
                                    {address.direccion.calle}, {address.direccion.ciudad},{' '}
                                    {address.direccion.departamento}
                                  </span>
                                </p>
                                {address.instruccionesEntrega && (
                                  <p className="mt-2 flex items-start gap-1.5 text-sm italic text-gray-500">
                                    <ChatBubbleBottomCenterTextIcon
                                      className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                                      aria-hidden
                                    />
                                    {address.instruccionesEntrega}
                                  </p>
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
                        Usar una nueva dirección
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
                            onChange={(e) => setNewAddress((prev: Address) => ({
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
                            onChange={(e) => setNewAddress((prev: Address) => ({
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
                            onChange={(e) => setNewAddress((prev: Address) => ({
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
                            onChange={(e) => setNewAddress((prev: Address) => ({
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
                              setNewAddress((prev: Address) => ({
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
                    <div className="mb-6 overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 via-white to-white shadow-sm">
                      <div className="border-b border-green-100 p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm">
                            <BuildingStorefrontIcon className="h-7 w-7" aria-hidden />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Recogida confirmada</p>
                            <h3 className="mt-1 text-lg font-semibold text-gray-950">Recogerás tu pedido en:</h3>
                            <p className="mt-2 text-base font-semibold text-gray-900">{PICKUP_LOCATION.name}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                              <MapPinIcon className="h-4 w-4 text-green-600" aria-hidden />
                              {PICKUP_LOCATION.address}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 p-5 text-sm text-gray-700 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-4 ring-1 ring-green-100">
                          <p className="mb-1 flex items-center gap-2 font-medium text-gray-900">
                            <ClockIcon className="h-4 w-4 text-green-600" aria-hidden />
                            Horario
                          </p>
                          <p>{PICKUP_LOCATION.schedule}</p>
                        </div>
                        <div className="rounded-xl bg-white p-4 ring-1 ring-green-100">
                          <p className="mb-1 flex items-center gap-2 font-medium text-gray-900">
                            <PhoneIcon className="h-4 w-4 text-green-600" aria-hidden />
                            Contacto
                          </p>
                          <p>{PICKUP_LOCATION.contact}</p>
                        </div>
                        <p className="sm:col-span-2 rounded-xl bg-green-600/5 p-4 leading-6 text-green-900">
                          {PICKUP_LOCATION.instructions} No necesitas registrar dirección y el envío queda en $0.
                        </p>
                      </div>
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
                        de {BRAND_NAME}
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

                  <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                    <label className="block text-sm font-medium text-gray-800 mb-2" htmlFor="payer-document">
                      Documento del pagador (cédula) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="payer-document"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Solo números, 6 a 11 dígitos"
                      value={payerDocument}
                      onChange={(e) => setPayerDocument(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => setPayerDocumentTouched(true)}
                      className={payerDocumentTouched && payerDocument.replace(/\D/g, '').length < 6 ? 'border-red-300' : ''}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Wompi lo requiere para antifraude. No almacenamos datos de tarjeta.
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="rounded-xl border border-primary-200 bg-white p-5 shadow-soft">
                      <h3 className="text-base font-semibold text-gray-900">Wompi</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        PSE, Nequi, tarjetas y demás medios habilitados por Wompi en Colombia.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6 text-sm text-gray-600 space-y-2">
                    <p className="font-medium text-gray-800">Proceso</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Al pagar, serás redirigido a Wompi.</li>
                      <li>Al volver, verificamos el estado en el servidor (no solo la URL).</li>
                      <li>Recibirás el detalle en &quot;Mis pedidos&quot;.</li>
                    </ol>
                  </div>

                  {/* Botón de pago */}
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={handlePayment}
                        disabled={isCheckoutBusy}
                        className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-lg px-8 py-3"
                      >
                        {isCheckoutBusy ? (
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
                    {isCheckoutBusy && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                          <div>
                            <p className="text-blue-800 font-medium">Procesando tu pago...</p>
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
          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft sm:p-6 lg:sticky lg:top-24 lg:z-10 lg:self-start">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Resumen del pedido
              </h3>
              
              {/* Productos */}
              <div className="space-y-3 mb-4">
                {cart.productos.map((item: CartItem, index: number) => (
                  <div key={`${item.producto._id}-${index}`} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-2">{item.producto.nombre}</p>
                      {item.variante?.attributes ? (
                        <p className="mt-1 text-xs text-gray-500">
                          {Object.entries(item.variante.attributes)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' · ')}
                        </p>
                      ) : null}
                      {item.variante?.sku ? (
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">SKU {item.variante.sku}</p>
                      ) : null}
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
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                      <p className="font-semibold">{PICKUP_LOCATION.name}</p>
                      <p className="mt-1 flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4 text-green-700" aria-hidden />
                        {PICKUP_LOCATION.address}
                      </p>
                      <p className="mt-2 text-green-800">Sin costo de envío. Te contactaremos para coordinar la recogida.</p>
                    </div>
                  ) : useNewAddress ? (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium">{newAddress.nombreDestinatario}</p>
                      <p className="flex items-center gap-1.5 text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 text-gray-400" aria-hidden />
                        {newAddress.telefono}
                      </p>
                      <p className="flex items-start gap-1.5 text-sm text-gray-600">
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                        {newAddress.direccion.calle}
                      </p>
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
                              <p className="flex items-center gap-1.5 text-sm text-gray-600">
                                <PhoneIcon className="h-4 w-4 text-gray-400" aria-hidden />
                                {addr.telefono}
                              </p>
                              <p className="flex items-start gap-1.5 text-sm text-gray-600">
                                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                {addr.direccion.calle}
                              </p>
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
                  <div className="text-sm text-gray-600">Wompi (todos los medios habilitados)</div>
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

        <div className="lg:hidden fixed inset-x-0 bottom-0 z-dropdown border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Total</p>
              <p className="text-lg font-semibold text-gray-900">${cart.total.toLocaleString('es-CO')}</p>
            </div>
            {currentStep === 1 ? (
              <Button size="lg" disabled={!acceptedTerms} onClick={handleNextStep}>
                Continuar
              </Button>
            ) : (
              <Button size="lg" variant="primary" loading={isCheckoutBusy} onClick={handlePayment}>
                Pagar
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default CheckoutPageOptimized;
