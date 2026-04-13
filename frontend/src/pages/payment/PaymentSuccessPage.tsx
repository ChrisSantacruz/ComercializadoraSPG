import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    loadOrderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrderData = async () => {
    try {
      const orderId = searchParams.get('orderId');
      if (!orderId) return;

      const response = await api.get(`/orders/${orderId}`);
      if (response.data.exito) {
        setOrderData(response.data.datos);
      }
    } catch (error) {
      console.error('Error cargando orden:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <span className="text-6xl">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            ¡Pago Exitoso!
          </h1>
          <p className="text-xl text-gray-600">
            Tu compra ha sido procesada correctamente
          </p>
        </div>

        {orderData && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles de tu Pedido</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Número de Orden:</span>
                <span className="font-semibold text-gray-900">{orderData.numeroOrden}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Pagado:</span>
                <span className="font-semibold text-green-600 text-xl">
                  ${orderData.total?.toLocaleString('es-CO')} COP
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {orderData.estado}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#0d8e76]/10 border-l-4 border-[#0d8e76] p-4 mb-6">
          <p className="text-sm text-gray-700">
            📧 Hemos enviado un correo de confirmación con los detalles de tu compra.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex-1 px-6 py-3 bg-[#0d8e76] text-white rounded-lg hover:bg-[#0b7a64] transition-colors font-medium"
          >
            Ver Mis Pedidos
          </button>
          <button
            onClick={() => navigate('/productos')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Seguir Comprando
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;