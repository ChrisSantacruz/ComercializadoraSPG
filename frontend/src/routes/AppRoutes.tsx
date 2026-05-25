import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import RouteChunkFallback from '../components/routing/RouteChunkFallback';
import { useRouteScrollRestoration } from '../hooks/useRouteScrollRestoration';

import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';

const HomePage = lazy(() => import('../pages/home/HomePage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const AboutUsPage = lazy(() => import('../pages/AboutUsPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const SelectRolePage = lazy(() => import('../pages/auth/SelectRolePage'));
const CompleteMerchantProfilePage = lazy(() => import('../pages/auth/CompleteMerchantProfilePage'));
const OAuthCallback = lazy(() => import('../pages/auth/OAuthCallback'));
const ProductsPage = lazy(() => import('../pages/products/ProductsPage'));
const ProductDetailPage = lazy(() => import('../pages/products/ProductDetailPage'));
const CartPage = lazy(() => import('../pages/cart/CartPage'));
const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage'));
const WompiReturnPageFixed = lazy(() => import('../pages/checkout/WompiReturnPageFixed'));

const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('../pages/orders/OrderDetailPage'));
const OrderConfirmationPage = lazy(() => import('../pages/orders/OrderConfirmationPage'));
const AddressesPage = lazy(() => import('../pages/profile/AddressesPage'));
const FavoritesPage = lazy(() => import('../pages/profile/FavoritesPage'));

const MerchantDashboard = lazy(() => import('../pages/merchant/MerchantDashboard'));
const MerchantProducts = lazy(() => import('../pages/merchant/MerchantProducts'));
const MerchantOrders = lazy(() => import('../pages/merchant/MerchantOrders'));
const MerchantAnalytics = lazy(() => import('../pages/merchant/MerchantAnalytics'));
const MerchantReviewsPage = lazy(() => import('../pages/merchant/MerchantReviewsPage'));

const PaymentSuccessPage = lazy(() => import('../pages/payment/PaymentSuccessPage'));
const PaymentPendingPage = lazy(() => import('../pages/payment/PaymentPendingPage'));
const PaymentFailedPage = lazy(() => import('../pages/payment/PaymentFailedPage'));

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

const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/" replace />;

  if (!user.rol) {
    return <Navigate to="/login" replace />;
  }

  switch (user.rol) {
    case 'comerciante':
      return <Navigate to="/merchant" replace />;
    case 'cliente':
    default:
      return <Navigate to="/profile" replace />;
  }
};

const AppRoutes: React.FC = () => {
  useRouteScrollRestoration();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapPhase = useAuthStore((s) => s.bootstrapPhase);

  if (bootstrapPhase !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="sobre-nosotros" element={<AboutUsPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="productos/:id" element={<ProductDetailPage />} />
          <Route path="carrito" element={<CartPage />} />

          <Route path="payment/wompi/return" element={<WompiReturnPageFixed />} />
          <Route path="wompi-return" element={<WompiReturnPageFixed />} />
          <Route path="order-confirmation" element={<WompiReturnPageFixed />} />

          <Route path="payment/success" element={<PaymentSuccessPage />} />
          <Route path="payment/pending" element={<PaymentPendingPage />} />
          <Route path="payment/failed" element={<PaymentFailedPage />} />

          <Route
            path="login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
          />
          <Route
            path="forgot-password"
            element={isAuthenticated ? <Navigate to="/profile" replace /> : <ForgotPasswordPage />}
          />
          <Route path="restablecer-password" element={<ResetPasswordPage />} />
          <Route path="reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="verificar-email" element={<VerifyEmailPage />} />
          <Route path="select-role" element={<SelectRolePage />} />
          <Route path="complete-merchant-profile" element={<CompleteMerchantProfilePage />} />

          <Route path="auth/callback" element={<OAuthCallback />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="perfil" element={<RoleBasedRedirect />} />

          <Route path="profile" element={<ProfilePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="order-confirmation/:id" element={<OrderConfirmationPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="checkout" element={<CheckoutPage />} />

          <Route
            path="merchant"
            element={
              <ProtectedRoute requiredRole="comerciante">
                <MerchantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="merchant/products"
            element={
              <ProtectedRoute requiredRole="comerciante">
                <MerchantProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="merchant/orders"
            element={
              <ProtectedRoute requiredRole="comerciante">
                <MerchantOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="merchant/orders/:id"
            element={
              <ProtectedRoute requiredRole="comerciante">
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="merchant/analytics"
            element={
              <ProtectedRoute requiredRole="comerciante">
                <MerchantAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="merchant/reviews"
            element={
              <ProtectedRoute requiredRole="comerciante">
                <MerchantReviewsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="mb-4 text-4xl font-bold text-gray-900">404</h1>
                <p className="mb-6 text-gray-600">Página no encontrada</p>
                <a href="/" className="btn-primary">
                  Volver al inicio
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
