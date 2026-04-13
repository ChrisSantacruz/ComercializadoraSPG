import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Páginas públicas
import NewHomePage from '../pages/NewHomePage';
import AboutUsPage from '../pages/AboutUsPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import SelectRolePage from '../pages/auth/SelectRolePage';
import CompleteMerchantProfilePage from '../pages/auth/CompleteMerchantProfilePage';
import OAuthCallback from '../pages/auth/OAuthCallback';
import ProductsPage from '../pages/products/ProductsPage';
import ProductDetailPage from '../pages/products/ProductDetailPage';
import CartPage from '../pages/cart/CartPage';
import CheckoutPage from '../pages/checkout/CheckoutPage';
import WompiReturnPageFixed from '../pages/checkout/WompiReturnPageFixed';

// Páginas privadas - Cliente
import ProfilePage from '../pages/profile/ProfilePage';
import OrdersPage from '../pages/orders/OrdersPage';
import OrderDetailPage from '../pages/orders/OrderDetailPage';
import OrderConfirmationPage from '../pages/orders/OrderConfirmationPage';
import AddressesPage from '../pages/profile/AddressesPage';
import FavoritesPage from '../pages/profile/FavoritesPage';

// Páginas privadas - Comerciante
import MerchantDashboard from '../pages/merchant/MerchantDashboard';
import MerchantProducts from '../pages/merchant/MerchantProducts';
import MerchantOrders from '../pages/merchant/MerchantOrders';
import MerchantAnalytics from '../pages/merchant/MerchantAnalytics';
import MerchantReviewsPage from '../pages/merchant/MerchantReviewsPage';

// Páginas de pago
import PaymentSuccessPage from '../pages/payment/PaymentSuccessPage';
import PaymentPendingPage from '../pages/payment/PaymentPendingPage';
import PaymentFailedPage from '../pages/payment/PaymentFailedPage';



// Componente de protección de rutas
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'cliente' | 'comerciante';
}> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.rol !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Componente de redirección basada en rol
const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/" replace />;

  switch (user.rol) {
    case 'comerciante':
      return <Navigate to="/merchant" replace />;
    case 'cliente':
    default:
      return <Navigate to="/profile" replace />;
  }
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<NewHomePage />} />
        <Route path="sobre-nosotros" element={<AboutUsPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="productos/:id" element={<ProductDetailPage />} />
        <Route path="carrito" element={<CartPage />} />
        
        {/* Páginas de retorno de Wompi - accesibles sin autenticación */}
        <Route path="payment/wompi/return" element={<WompiReturnPageFixed />} />
        <Route path="wompi-return" element={<WompiReturnPageFixed />} />
        <Route path="order-confirmation" element={<WompiReturnPageFixed />} />
        
        {/* Páginas de estado de pago */}
        <Route path="payment/success" element={<PaymentSuccessPage />} />
        <Route path="payment/pending" element={<PaymentPendingPage />} />
        <Route path="payment/failed" element={<PaymentFailedPage />} />
        
        {/* Rutas de autenticación - solo para no autenticados */}
        <Route 
          path="login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } 
        />
        <Route 
          path="register" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
          } 
        />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="verificar-email" element={<VerifyEmailPage />} />
        <Route path="select-role" element={<SelectRolePage />} />
        <Route path="complete-merchant-profile" element={<CompleteMerchantProfilePage />} />
        
        {/* Callback de OAuth - siempre accesible */}
        <Route path="auth/callback" element={<OAuthCallback />} />
      </Route>

      {/* Rutas protegidas */}
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        {/* Redirección basada en rol - mantenemos /perfil como alias */}
        <Route path="perfil" element={<RoleBasedRedirect />} />

        {/* Rutas de cliente */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="order-confirmation/:id" element={<OrderConfirmationPage />} />
        <Route path="addresses" element={<AddressesPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="checkout" element={<CheckoutPage />} />

        {/* Rutas de comerciante */}
        <Route path="merchant" element={
          <ProtectedRoute requiredRole="comerciante">
            <MerchantDashboard />
          </ProtectedRoute>
        } />
        <Route path="merchant/products" element={
          <ProtectedRoute requiredRole="comerciante">
            <MerchantProducts />
          </ProtectedRoute>
        } />
        <Route path="merchant/orders" element={
          <ProtectedRoute requiredRole="comerciante">
            <MerchantOrders />
          </ProtectedRoute>
        } />
        <Route path="merchant/orders/:id" element={
          <ProtectedRoute requiredRole="comerciante">
            <OrderDetailPage />
          </ProtectedRoute>
        } />
        <Route path="merchant/analytics" element={
          <ProtectedRoute requiredRole="comerciante">
            <MerchantAnalytics />
          </ProtectedRoute>
        } />
        <Route path="merchant/reviews" element={
          <ProtectedRoute requiredRole="comerciante">
            <MerchantReviewsPage />
          </ProtectedRoute>
        } />


      </Route>

      {/* Ruta 404 */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-gray-600 mb-6">Página no encontrada</p>
            <a href="/" className="btn-primary">
              Volver al inicio
            </a>
          </div>
        </div>
      } />
    </Routes>
  );
};

export default AppRoutes; 