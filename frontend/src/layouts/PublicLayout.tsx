import React from 'react';
import { Outlet } from 'react-router-dom';
import SupportChat from '../components/support/SupportChat';
import Footer from '../components/ui/Footer';
import Navbar from '../components/ui/Navbar';
import ErrorBoundary from '../components/ui/ErrorBoundary';

const PublicLayout: React.FC = () => {

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar fijo: safe-area notch + offset alineado a promo (md+) y alturas reales del header */}
      <div className="fixed top-0 left-0 right-0 z-nav pt-[env(safe-area-inset-top,0px)]">
        <Navbar />
      </div>

      <main className="flex-1 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-[calc(7rem+env(safe-area-inset-top,0px))]">
        <ErrorBoundary zone="public">
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <Footer />

      {/* Chat de Soporte */}
      <SupportChat />
    </div>
  );
};

export default PublicLayout; 