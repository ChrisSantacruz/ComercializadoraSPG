import React from 'react';
import { ArchiveBoxIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Product } from '../../types';
import { getFirstImageUrl } from '../../utils/imageUtils';

interface TopProduct {
  producto: Product;
  cantidadVendida: number;
  ingresosTotales: number;
}

interface TopProductsWidgetProps {
  topProducts: TopProduct[];
  loading?: boolean;
}

const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ 
  topProducts, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
          <TrophyIcon className="h-5 w-5 text-yellow-500" aria-hidden />
          Productos más vendidos
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900">
          <TrophyIcon className="h-5 w-5 text-yellow-500" aria-hidden />
          Productos más vendidos
        </h3>
        <span className="text-sm text-gray-500">Últimos 30 días</span>
      </div>

      {topProducts.length === 0 ? (
        <div className="text-center py-6">
          <ArchiveBoxIcon className="mx-auto mb-2 h-10 w-10 text-gray-400" aria-hidden />
          <p className="text-gray-500">No hay ventas registradas aún</p>
          <p className="text-sm text-gray-400">Tus productos más vendidos aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topProducts.slice(0, 5).map((item, index) => (
            <div key={item.producto._id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* Ranking */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                index === 0 ? 'bg-yellow-500' : 
                index === 1 ? 'bg-gray-400' : 
                index === 2 ? 'bg-amber-600' : 'bg-blue-500'
              }`}>
                {index + 1}
              </div>

              {/* Imagen del producto */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={getFirstImageUrl(item.producto.imagenes)}
                  alt={item.producto.nombre}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Información del producto */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {item.producto.nombre}
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-blue-600 font-medium">
                    {item.cantidadVendida} vendidos
                  </span>
                  <span className="text-green-600 font-medium">
                    ${item.ingresosTotales.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {index < 3 ? <TrophyIcon className="h-6 w-6 text-yellow-500" aria-hidden /> : null}
            </div>
          ))}

          {/* Mostrar total general */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Total productos activos:</span>
              <span className="text-blue-600">{topProducts.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="font-medium text-gray-700">Ingresos totales:</span>
              <span className="text-green-600 font-bold">
                ${topProducts.reduce((sum, item) => sum + item.ingresosTotales, 0).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopProductsWidget; 