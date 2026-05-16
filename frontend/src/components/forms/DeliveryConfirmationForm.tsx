import React, { useState } from 'react';
import { Order } from '../../types';
import { useNotifications } from '../ui/NotificationContainer';
import orderService from '../../services/orderService';

interface DeliveryConfirmationFormProps {
  order: Order;
  onConfirmed: (confirmed: boolean) => void;
  onClose: () => void;
}

const DeliveryConfirmationForm: React.FC<DeliveryConfirmationFormProps> = ({
  order,
  onConfirmed,
  onClose
}) => {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [problems, setProblems] = useState<Array<{tipo: string, descripcion: string}>>([]);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotifications();

  const problemTypes = [
    { value: 'producto_dañado', label: 'Producto dañado' },
    { value: 'producto_incorrecto', label: 'Producto incorrecto' },
    { value: 'entrega_tardia', label: 'Entrega tardía' },
    { value: 'producto_faltante', label: 'Producto faltante' },
    { value: 'otro', label: 'Otro' }
  ];

  const addProblem = () => {
    setProblems([...problems, { tipo: '', descripcion: '' }]);
  };

  const updateProblem = (index: number, field: 'tipo' | 'descripcion', value: string) => {
    const newProblems = [...problems];
    newProblems[index][field] = value;
    setProblems(newProblems);
  };

  const removeProblem = (index: number) => {
    setProblems(problems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmed === null) {
      showError('Error de validación', 'Por favor indica si recibiste el pedido correctamente');
      return;
    }

    setLoading(true);
    
    try {
      await orderService.confirmDelivery(order._id!, {
        confirmado: confirmed,
        comentario: comment,
        calificacionEntrega: confirmed ? rating : undefined,
        problemas: confirmed ? [] : problems.filter(p => p.tipo && p.descripcion)
      });

      if (confirmed) {
        showSuccess('Entrega confirmada', '¡Entrega confirmada exitosamente! Ahora puedes dejar reseñas de los productos.');
      } else {
        showSuccess('Problema reportado', 'Nos pondremos en contacto contigo pronto.');
      }
      
      onConfirmed(confirmed);
      onClose();
    } catch {
      showError('Error', 'Error al confirmar la entrega');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Confirmar Entrega - Pedido #{order.numeroOrden}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pregunta principal */}
            <div>
              <p className="text-lg font-medium text-gray-900 mb-4">
                ¿Recibiste tu pedido correctamente?
              </p>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="confirmed"
                    value="true"
                    onChange={() => setConfirmed(true)}
                    className="mr-3"
                  />
                  <span className="text-green-600 font-medium">✅ Sí, recibí todo correctamente</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="confirmed"
                    value="false"
                    onChange={() => setConfirmed(false)}
                    className="mr-3"
                  />
                  <span className="text-red-600 font-medium">❌ No, hubo problemas</span>
                </label>
              </div>
            </div>

            {/* Si confirmó positivamente */}
            {confirmed === true && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Califica la experiencia de entrega
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl ${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {rating === 1 && 'Muy malo'}
                    {rating === 2 && 'Malo'}
                    {rating === 3 && 'Regular'}
                    {rating === 4 && 'Bueno'}
                    {rating === 5 && 'Excelente'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios adicionales (opcional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cuéntanos sobre tu experiencia..."
                  />
                </div>
              </div>
            )}

            {/* Si reportó problemas */}
            {confirmed === false && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe el problema
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe qué problema hubo con tu pedido..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Problemas específicos</h4>
                    <button
                      type="button"
                      onClick={addProblem}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Agregar problema
                    </button>
                  </div>

                  {problems.map((problem, index) => (
                    <div key={index} className="flex space-x-2 mb-2">
                      <select
                        value={problem.tipo}
                        onChange={(e) => updateProblem(index, 'tipo', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar tipo</option>
                        {problemTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={problem.descripcion}
                        onChange={(e) => updateProblem(index, 'descripcion', e.target.value)}
                        placeholder="Descripción"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeProblem(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || confirmed === null}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Enviando...' : confirmed ? 'Confirmar Entrega' : 'Reportar Problema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeliveryConfirmationForm; 