import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

interface RatingsChartProps {
  data: {
    rating: number;
    count: number;
  }[];
  averageRating: number;
  totalReviews: number;
}

const RatingsChart: React.FC<RatingsChartProps> = ({ 
  data, 
  averageRating, 
  totalReviews 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Calificaciones</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No hay calificaciones disponibles
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
        aria-hidden
      />
    ));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Calificaciones</h3>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex">
              {renderStars(Math.round(averageRating))}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {totalReviews} reseña{totalReviews !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const ratingData = data.find(d => d.rating === rating);
          const count = ratingData?.count || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

          return (
            <div key={rating} className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 w-12">
                <span className="text-sm font-medium text-gray-700">{rating}</span>
                <StarIcon className="h-4 w-4 text-yellow-400" aria-hidden />
              </div>
              
              <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                <div
                  className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="text-sm text-gray-600 w-16 text-right">
                {count} ({percentage.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribución visual */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Distribución</h4>
        <div className="flex items-end justify-between h-24 space-x-1">
          {[1, 2, 3, 4, 5].map((rating) => {
            const ratingData = data.find(d => d.rating === rating);
            const count = ratingData?.count || 0;
            const height = maxCount > 0 ? (count / maxCount) * 80 : 0;

            return (
              <div key={rating} className="flex flex-col items-center group relative">
                <div 
                  className="bg-yellow-400 hover:bg-yellow-500 transition-colors rounded-t-sm w-8"
                  style={{ height: `${height}px` }}
                >
                  {/* Tooltip */}
                  <div className="invisible group-hover:visible absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    {count} calificaciones
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-600 flex items-center">
                  {rating}
                  <StarIcon className="ml-0.5 h-3.5 w-3.5 text-yellow-400" aria-hidden />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RatingsChart; 