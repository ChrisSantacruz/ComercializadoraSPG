import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { useNotifications } from '../../components/ui/NotificationContainer';
import { useCartStore } from '../../stores/cartStore';
import { useHomeData } from '../../hooks/useHomeData';
import { HomeHeroSection } from '../../components/home/HomeHeroSection';
import { HomeTrustStrip } from '../../components/home/HomeTrustStrip';
import { HomeCategoriesSection } from '../../components/home/HomeCategoriesSection';
import { HomeProductRailSection } from '../../components/home/HomeProductRailSection';
import { HomeCtaSection } from '../../components/home/HomeCtaSection';
import { SeoHead } from '../../components/seo/SeoHead';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotifications();
  const { addToCart } = useCartStore();
  const { data, reload } = useHomeData();

  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        await addToCart(product._id, 1, {
          successMessage: `${product.nombre} se agregó al carrito`,
          action: {
            label: 'Ver carrito',
            onClick: () => navigate('/carrito'),
          },
        });
      } catch {
        showError('Carrito', 'No se pudo agregar el producto. Intenta de nuevo.');
      }
    },
    [addToCart, navigate, showError],
  );

  return (
    <div className="min-w-0 bg-gray-50">
      <SeoHead
        title="Inicio"
        description="Catálogo B2B con logística Sur Andina: inventario curado, checkout seguro y soporte dedicado."
        canonicalPath="/"
      />
      <HomeHeroSection />
      <HomeTrustStrip />
      <HomeCategoriesSection
        categories={data.categories.data}
        state={data.categories.state}
        error={data.categories.error}
        onRetry={reload}
      />
      <HomeProductRailSection
        eyebrow="Curado para volumen"
        title="Selección destacada"
        description="Referencia de inventario aprobado y listo para movimiento."
        products={data.featured.data}
        state={data.featured.state}
        error={data.featured.error}
        onRetry={reload}
        onAddToCart={handleAddToCart}
      />
      <HomeProductRailSection
        eyebrow="Actualización continua"
        title="Recién incorporados"
        description="Novedades ordenadas por fecha de publicación."
        products={data.newArrivals.data}
        state={data.newArrivals.state}
        error={data.newArrivals.error}
        onRetry={reload}
        onAddToCart={handleAddToCart}
      />
      <HomeProductRailSection
        eyebrow="Eficiencia de compra"
        title="Mejor relación de precio"
        description="Referencias con entrada accesible para prueba o reposición."
        products={data.valuePicks.data}
        state={data.valuePicks.state}
        error={data.valuePicks.error}
        showOffer
        onRetry={reload}
        onAddToCart={handleAddToCart}
      />
      <HomeCtaSection />
    </div>
  );
};

export default HomePage;
