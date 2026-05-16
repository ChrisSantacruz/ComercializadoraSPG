import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import NotificationToast, { Notification } from './NotificationToast';
import { registerAppNotificationSink } from '../../lib/appNotifications';

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showSuccess: (title: string, message: string, action?: Notification['action']) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };

    setNotifications((prev) => {
      const dropCartSuccess =
        newNotification.type === 'success' &&
        (newNotification.title === 'Carrito' || newNotification.title === 'Carrito actualizado');

      const base = dropCartSuccess
        ? prev.filter(
            (n) =>
              !(
                n.type === 'success' &&
                (n.title === 'Carrito' || n.title === 'Carrito actualizado')
              ),
          )
        : prev;

      if (
        base.some(
          (n) =>
            n.type === newNotification.type &&
            n.title === newNotification.title &&
            n.message === newNotification.message,
        )
      ) {
        return base;
      }

      const merged = [...base, newNotification];
      return merged.length > 4 ? merged.slice(-4) : merged;
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string, action?: Notification['action']) => {
    showNotification({
      type: 'success',
      title,
      message,
      action,
      duration: 4000,
    });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string) => {
    showNotification({
      type: 'error',
      title,
      message,
      duration: 6000,
    });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string) => {
    showNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
    });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    showNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
    });
  }, [showNotification]);

  useEffect(() => {
    registerAppNotificationSink({
      showSuccess,
      showError,
    });
    return () => registerAppNotificationSink(null);
  }, [showSuccess, showError]);

  const contextValue: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Toasts: abajo en móvil (pulgar / safe-area), esquina superior derecha en desktop — una sola cola */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex max-h-[42dvh] flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-4 sm:inset-x-auto sm:bottom-auto sm:right-[max(1rem,env(safe-area-inset-right,0px))] sm:top-[max(5.5rem,env(safe-area-inset-top,0px))] sm:max-h-none sm:max-w-md sm:flex-col sm:items-end sm:overflow-visible sm:px-0 sm:pb-6 sm:pt-4"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {notifications.map((notification) => (
          <NotificationToast key={notification.id} notification={notification} onClose={removeNotification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 