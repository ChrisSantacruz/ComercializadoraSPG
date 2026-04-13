import React, { useEffect, useState } from 'react';

export interface NotificationCardProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  showProgress?: boolean;
  duration?: number;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ 
  type, 
  title, 
  message, 
  action, 
  onClose,
  showProgress = false,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animar entrada
    setTimeout(() => setIsVisible(true), 10);

    // Barra de progreso
    if (showProgress && duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          handleClose();
        }
      }, 50);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProgress, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200/50';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200/50';
      case 'info':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50';
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200/50';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        w-full ${getBackgroundColor()} border-2 rounded-2xl shadow-xl
        backdrop-blur-sm bg-opacity-95
      `}
    >
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {/* Icon Container */}
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {message}
                </p>
              </div>
              
              {/* Close Button */}
              {onClose && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-shrink-0 ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Action Button */}
            {action && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={action.onClick}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  {action.label}
                  <svg className="ml-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      {showProgress && (
        <div className="h-2 bg-gray-200 rounded-b-2xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-linear"
            style={{
              width: `${progress}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationCard; 