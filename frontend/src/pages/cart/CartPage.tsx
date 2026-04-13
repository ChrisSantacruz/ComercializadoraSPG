import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNotifications } from '../../components/ui/NotificationContainer';
import { useCartStore } from '../../stores/cartStore';
import { Cart, CartItem, DeliveryType } from '../../types';
import { getImageUrl } from '../../utils/imageUtils';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { showWarning } = useNotifications();
  const { cart: storeCart, getCart, updateQuantity: updateStoreQuantity, removeItem: removeStoreItem, clearCart: clearStoreCart, updateDeliveryType: updateStoreDeliveryType } = useCartStore();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [updatingDeliveryType, setUpdatingDeliveryType] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  // Sincronizar con el store
  useEffect(() => {
    if (storeCart) {
      setCart(storeCart);
    }
  }, [storeCart]);

  const loadCart = async () => {
    try {
      setLoading(true);
      await getCart();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando carrito');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }

    try {
      setUpdatingItem(productId);
      await updateStoreQuantity(productId, newQuantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando cantidad');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
      return;
    }

    try {
      setUpdatingItem(productId);
      await removeStoreItem(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando producto');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      return;
    }

    try {
      setLoading(true);
      await clearStoreCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error vaciando carrito');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryTypeChange = async (tipoEntrega: DeliveryType) => {
    if (!cart || cart.tipoEntrega === tipoEntrega) {
      return;
    }

    try {
      setUpdatingDeliveryType(true);
      await updateStoreDeliveryType(tipoEntrega);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando tipo de entrega');
    } finally {
      setUpdatingDeliveryType(false);
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.productos.length === 0) {
      showWarning('Carrito vacío', 'Agrega algunos productos antes de proceder al checkout');
      return;
    }
    
    // Redirigir a la página de checkout
    navigate('/checkout');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Carrito</h1>
            <p className="text-gray-600 mt-2">
              {cart && cart.productos.length > 0 
                ? `${cart.productos.length} productos en tu carrito`
                : 'Tu carrito está vacío'
              }
            </p>
          </div>
          {cart && cart.productos.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Vaciar carrito
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {cart && cart.productos.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Productos en el carrito */}
          <div className="lg:col-span-2 space-y-4">
            {cart.productos.map((item: CartItem) => (
              <div key={item._id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex gap-4">
                  {/* Imagen del producto - Mejorada */}
                  <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32">
                    {item.producto.imagenes && item.producto.imagenes.length > 0 ? (
                      <img
                        src={getImageUrl(item.producto.imagenes[0])}
                        alt={item.producto.nombre}
                        className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/images/default-product.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Información del producto y controles */}
                  <div className="flex-grow flex flex-col sm:flex-row justify-between gap-4">
                    {/* Info del producto */}
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.producto.nombre}
                      </h3>
                      {item.producto.descripcion && (
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {item.producto.descripcion}
                        </p>
                      )}
                      <p className="text-xl font-bold text-green-600">
                        ${item.precio.toLocaleString('es-CO')}
                      </p>
                    </div>

                    {/* Controles de cantidad y eliminar */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                      {/* Controles de cantidad */}
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleUpdateQuantity(item.producto._id, item.cantidad - 1)}
                          disabled={!!(updatingItem === item.producto._id || item.cantidad <= 1)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg"
                        >
                          -
                        </button>
                        <span className="px-4 py-2 text-gray-900 font-medium min-w-[50px] text-center">
                          {updatingItem === item.producto._id ? '...' : item.cantidad}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.producto._id, item.cantidad + 1)}
                          disabled={!!(updatingItem === item.producto._id || item.cantidad >= item.producto.stock)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg"
                        >
                          +
                        </button>
                      </div>

                      {/* Botón eliminar */}
                      <button
                        onClick={() => handleRemoveItem(item.producto._id)}
                        disabled={!!(updatingItem === item.producto._id)}
                        className="text-red-600 hover:text-red-800 p-2 disabled:opacity-50 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar producto"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtotal del item */}
                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subtotal ({item.cantidad} {item.cantidad === 1 ? 'unidad' : 'unidades'})</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${item.subtotal.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Pedido</h3>

              <div className="mb-5 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900 mb-3">Método de entrega</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDeliveryTypeChange('domicilio')}
                    disabled={updatingDeliveryType}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      cart.tipoEntrega === 'domicilio'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${updatingDeliveryType ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <p className="font-medium">Envío a domicilio</p>
                    <p className="text-sm text-gray-600">Se aplica el costo estándar de envío.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeliveryTypeChange('recoger_establecimiento')}
                    disabled={updatingDeliveryType}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      cart.tipoEntrega === 'recoger_establecimiento'
                        ? 'border-green-600 bg-green-50 text-green-900'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${updatingDeliveryType ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <p className="font-medium">Recoger en establecimiento</p>
                    <p className="text-sm text-gray-600">No se cobra envío.</p>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${cart.subtotal.toLocaleString('es-CO')}</span>
                </div>
                
                {cart.descuentos > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuentos</span>
                    <span>-${cart.descuentos.toLocaleString('es-CO')}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {cart.tipoEntrega === 'recoger_establecimiento' ? 'Recogida en establecimiento' : 'Costo de envío'}
                  </span>
                  <span className="font-medium">
                    {cart.costoEnvio === 0 ? 'Gratis' : `$${cart.costoEnvio.toLocaleString('es-CO')}`}
                  </span>
                </div>
                {cart.tipoEntrega === 'recoger_establecimiento' ? (
                  <p className="text-xs text-green-600 -mt-2">
                    🏬 Recogerás tu pedido directamente en el establecimiento.
                  </p>
                ) : cart.costoEnvio > 0 && (
                  <p className="text-xs text-gray-500 -mt-2">
                    🚚 Envío a toda Colombia
                  </p>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Impuestos</span>
                  <span className="font-medium">${cart.impuestos.toLocaleString('es-CO')}</span>
                </div>
                
                <hr className="my-4" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">${cart.total.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Cupones aplicados */}
              {cart.cupones && cart.cupones.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Cupones aplicados:</h4>
                  {cart.cupones.map((cupon, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700">{cupon.codigo}</span>
                      <span className="text-green-600 font-medium">
                        {cupon.tipoDescuento === 'porcentaje' 
                          ? `-${cupon.descuento}%` 
                          : `-$${cupon.descuento.toLocaleString('es-CO')}`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón de checkout */}
              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium mt-6"
              >
                Proceder al Checkout
              </button>

              {/* Botón continuar comprando */}
              <button
                onClick={() => window.location.href = '/products'}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-medium mt-3"
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Carrito vacío
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m-.4-2L3 3m0 0h0m4 10v6a1 1 0 001 1h12a1 1 0 001-1v-6a1 1 0 00-1-1H8a1 1 0 00-1 1z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tu carrito está vacío</h3>
          <p className="text-gray-500 mb-6">Agrega algunos productos para empezar a comprar</p>
          <button
            onClick={() => window.location.href = '/products'}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Explorar Productos
          </button>
        </div>
      )}
    </div>
  );
};

export default CartPage; 