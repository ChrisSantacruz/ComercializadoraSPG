import React, { useState } from 'react';
import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Order } from '../../types';
import { useNotifications } from '../ui/NotificationContainer';
import reviewService from '../../services/reviewService';

interface ReviewFormProps {
  order: Order;
  productId: string;
  productName: string;
  onReviewSubmitted: () => void;
  onClose: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  order,
  productId,
  productName,
  onReviewSubmitted,
  onClose
}) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [aspects, setAspects] = useState({
    calidad: 5,
    precio: 5,
    entrega: 5,
    atencion: 5
  });
  const [recommend, setRecommend] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotifications();

  const aspectLabels = {
    calidad: 'Calidad del producto',
    precio: 'Relación calidad-precio',
    entrega: 'Tiempo de entrega',
    atencion: 'Atención al cliente'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (comment.length < 10) {
      showError('Error de validación', 'El comentario debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);
    
    try {
      await reviewService.createReview({
        producto: productId,
        pedido: order._id!,
        calificacion: rating,
        titulo: title,
        comentario: comment,
        aspectos: aspects,
        recomendaria: recommend
      });

      showSuccess('Reseña enviada', 'Tu reseña ha sido publicada exitosamente');
      onReviewSubmitted();
      onClose();
    } catch {
      showError('Error', 'Error al enviar la reseña');
    } finally {
      setLoading(false);
    }
  };

  const StarRating: React.FC<{ value: number; onChange: (value: number) => void; label: string }> = ({
    value,
    onChange,
    label
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-xl ${
              star <= value ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
            aria-label={`${star} de 5`}
          >
            <StarIcon className="h-6 w-6" aria-hidden />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {value === 1 && 'Muy malo'}
        {value === 2 && 'Malo'}
        {value === 3 && 'Regular'}
        {value === 4 && 'Bueno'}
        {value === 5 && 'Excelente'}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Reseñar Producto
          </h2>
          <p className="text-gray-600 mb-6">
            {productName} - Pedido #{order.numeroOrden}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Calificación general */}
            <StarRating
              value={rating}
              onChange={setRating}
              label="Calificación general"
            />

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la reseña (opcional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Excelente producto, muy recomendado"
              />
            </div>

            {/* Comentario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu experiencia *
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                minLength={10}
                maxLength={1000}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Comparte tu experiencia con este producto..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {comment.length}/1000 caracteres (mínimo 10)
              </p>
            </div>

            {/* Aspectos específicos */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Aspectos específicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(aspectLabels).map(([key, label]) => (
                  <StarRating
                    key={key}
                    value={aspects[key as keyof typeof aspects]}
                    onChange={(value) => setAspects(prev => ({ ...prev, [key]: value }))}
                    label={label}
                  />
                ))}
              </div>
            </div>

            {/* Recomendación */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                ¿Recomendarías este producto?
              </p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="recommend"
                    checked={recommend === true}
                    onChange={() => setRecommend(true)}
                    className="mr-3"
                  />
                  <span className="inline-flex items-center gap-2 text-green-600">
                    <HandThumbUpIcon className="h-5 w-5" aria-hidden />
                    Sí, lo recomiendo
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="recommend"
                    checked={recommend === false}
                    onChange={() => setRecommend(false)}
                    className="mr-3"
                  />
                  <span className="inline-flex items-center gap-2 text-red-600">
                    <HandThumbDownIcon className="h-5 w-5" aria-hidden />
                    No lo recomiendo
                  </span>
                </label>
              </div>
            </div>

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
                disabled={loading || comment.length < 10}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Enviando...' : 'Enviar Reseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm; 