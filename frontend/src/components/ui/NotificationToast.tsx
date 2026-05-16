import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const iconWrap =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 sm:h-10 sm:w-10';

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    window.setTimeout(() => onClose(notification.id), 200);
  }, [notification.id, onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!notification.duration || notification.duration <= 0) return undefined;
    const timer = window.setTimeout(handleClose, notification.duration);
    return () => clearTimeout(timer);
  }, [notification.duration, handleClose]);

  const tone = (() => {
    switch (notification.type) {
      case 'success':
        return {
          icon: (
            <div className={`${iconWrap} text-success-600`}>
              <CheckCircleIcon className="h-6 w-6 sm:h-[1.6rem] sm:w-[1.6rem]" />
            </div>
          ),
          bar: 'bg-success-500',
        };
      case 'error':
        return {
          icon: (
            <div className={`${iconWrap} text-error-600`}>
              <XCircleIcon className="h-6 w-6 sm:h-[1.6rem] sm:w-[1.6rem]" />
            </div>
          ),
          bar: 'bg-error-500',
        };
      case 'warning':
        return {
          icon: (
            <div className={`${iconWrap} text-warning-600`}>
              <ExclamationTriangleIcon className="h-6 w-6 sm:h-[1.6rem] sm:w-[1.6rem]" />
            </div>
          ),
          bar: 'bg-warning-500',
        };
      case 'info':
      default:
        return {
          icon: (
            <div className={`${iconWrap} text-primary-600`}>
              <InformationCircleIcon className="h-6 w-6 sm:h-[1.6rem] sm:w-[1.6rem]" />
            </div>
          ),
          bar: 'bg-primary-600',
        };
    }
  })();

  return (
    <div
      className={`pointer-events-auto w-full overflow-hidden rounded-xl border border-gray-200/95 bg-white/98 shadow-medium transition duration-200 ease-out backdrop-blur-sm sm:max-w-[26rem] ${
        isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 sm:translate-x-2 sm:translate-y-0'
      }`}
      role="status"
    >
      <div className="flex gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
        {tone.icon}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-gray-900 sm:text-[15px]">{notification.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600 sm:text-[14px]">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              aria-label="Cerrar notificación"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {notification.action ? (
            <button
              type="button"
              onClick={notification.action.onClick}
              className="mt-1.5 text-[11px] font-semibold text-primary-700 transition-colors hover:text-primary-900"
            >
              {notification.action.label}
            </button>
          ) : null}
        </div>
      </div>

      {notification.duration && notification.duration > 0 ? (
        <div className="h-0.5 bg-gray-100">
          <div
            className={`h-full origin-left rounded-full ${tone.bar}`}
            style={{
              animationName: 'toast-progress',
              animationDuration: `${notification.duration}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default NotificationToast;
