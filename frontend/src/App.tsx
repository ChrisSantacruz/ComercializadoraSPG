import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { NotificationProvider } from './components/ui/NotificationContainer';
import AuthProvider from './auth/AuthProvider';
import { QueryProvider } from './lib/query/QueryProvider';
import { ProductionShell } from './components/system/ProductionShell';
import { NetworkStatusBanner } from './components/system/NetworkStatusBanner';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <ProductionShell>
          <AuthProvider>
            <NotificationProvider>
              <NetworkStatusBanner />
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </ProductionShell>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App; 