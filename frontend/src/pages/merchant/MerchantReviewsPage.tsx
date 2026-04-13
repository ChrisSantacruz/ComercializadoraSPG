import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Review {
  _id: string;
  producto: {
    _id: string;
    nombre: string;
    imagenPrincipal: string;
  };
  usuario: {
    nombre: string;
    avatar?: string;
  };
  calificacion: number;
  titulo?: string;
  comentario: string;
  imagenes?: Array<{
    url: string;
    descripcion?: string;
  }>;
  videos?: Array<{
    url: string;
    descripcion?: string;
  }>;
  aspectos?: {
    calidad?: number;
    precio?: number;
    entrega?: number;
    atencion?: number;
  };
  fechaCreacion: string;
  verificada: boolean;
  respuestaComerciante?: {
    respuesta: string;
    fecha: Date;
  };
}

const MerchantReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    loadReviews();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedFilter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reviews/merchant-reviews`, {
        params: {
          page,
          limit: 10,
          calificacion: selectedFilter !== 'all' ? selectedFilter : undefined
        }
      });
      
      if (response.data.exito) {
        setReviews(response.data.datos.reseñas || []);
        setTotalPages(response.data.datos.paginacion?.totalPaginas || 1);
      }
    } catch (error) {
      console.error('Error cargando reseñas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/reviews/merchant/stats');
      if (response.data.exito) {
        setStats(response.data.datos);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span key={index} className={index < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ⭐
      </span>
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Reseñas de mis Productos
          </h1>
          
          {/* Estadísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[#0d8e76]/10 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total de Reseñas</p>
                <p className="text-2xl font-bold text-[#0d8e76]">{stats.totalReseñas}</p>
              </div>
              <div className="bg-[#f2902f]/10 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Calificación Promedio</p>
                <p className="text-2xl font-bold text-[#f2902f]">
                  {stats.promedioGeneral?.toFixed(1)} ⭐
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Productos con Reseñas</p>
                <p className="text-2xl font-bold text-green-600">{stats.productosConReseñas}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Tasa de Respuesta</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.tasaRespuesta?.toFixed(0)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', '5', '4', '3', '2', '1'].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setSelectedFilter(filter);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-[#0d8e76] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'Todas' : `${filter} ⭐`}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Reseñas */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d8e76]"></div>
            <p className="mt-4 text-gray-600">Cargando reseñas...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-xl text-gray-600">No hay reseñas aún</p>
            <p className="text-gray-500 mt-2">Tus productos aún no tienen reseñas de clientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="bg-white rounded-lg shadow-md p-6">
                {/* Header de la reseña */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <img
                      src={review.producto.imagenPrincipal || '/placeholder.jpg'}
                      alt={review.producto.nombre}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {review.producto.nombre}
                      </h3>
                      <div className="flex items-center mt-1">
                        {renderStars(review.calificacion)}
                        <span className="ml-2 text-sm text-gray-600">
                          {review.calificacion}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.verificada && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ Compra Verificada
                    </span>
                  )}
                </div>

                {/* Usuario */}
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {review.usuario.avatar ? (
                      <img
                        src={review.usuario.avatar}
                        alt={review.usuario.nombre}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <span className="text-gray-600 font-medium">
                        {review.usuario.nombre.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{review.usuario.nombre}</p>
                    <p className="text-sm text-gray-500">{formatDate(review.fechaCreacion)}</p>
                  </div>
                </div>

                {/* Título y comentario */}
                {review.titulo && (
                  <h4 className="font-semibold text-gray-900 mb-2">{review.titulo}</h4>
                )}
                <p className="text-gray-700 mb-4">{review.comentario}</p>

                {/* Aspectos */}
                {review.aspectos && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {review.aspectos.calidad && (
                      <div>
                        <p className="text-sm text-gray-600">Calidad</p>
                        <div className="flex">{renderStars(review.aspectos.calidad)}</div>
                      </div>
                    )}
                    {review.aspectos.precio && (
                      <div>
                        <p className="text-sm text-gray-600">Precio</p>
                        <div className="flex">{renderStars(review.aspectos.precio)}</div>
                      </div>
                    )}
                    {review.aspectos.entrega && (
                      <div>
                        <p className="text-sm text-gray-600">Entrega</p>
                        <div className="flex">{renderStars(review.aspectos.entrega)}</div>
                      </div>
                    )}
                    {review.aspectos.atencion && (
                      <div>
                        <p className="text-sm text-gray-600">Atención</p>
                        <div className="flex">{renderStars(review.aspectos.atencion)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Imágenes y Videos */}
                {(review.imagenes || review.videos) && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {review.imagenes?.map((img, index) => (
                      <img
                        key={index}
                        src={img.url}
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                    {review.videos?.map((video, index) => (
                      <video
                        key={index}
                        src={video.url}
                        className="w-full h-24 object-cover rounded-lg"
                        controls
                      />
                    ))}
                  </div>
                )}

                {/* Respuesta del comerciante */}
                {review.respuestaComerciante ? (
                  <div className="mt-4 bg-[#0d8e76]/5 p-4 rounded-lg border-l-4 border-[#0d8e76]">
                    <p className="font-semibold text-[#0d8e76] mb-1">Tu respuesta:</p>
                    <p className="text-gray-700">{review.respuestaComerciante.respuesta}</p>
                  </div>
                ) : (
                  <button className="mt-4 px-4 py-2 bg-[#f2902f] text-white rounded-lg hover:bg-[#e07d1f] transition-colors">
                    Responder
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-700">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantReviewsPage;
