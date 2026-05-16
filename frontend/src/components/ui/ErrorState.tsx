import React from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'rounded-xl border border-error-200 bg-error-50/60 px-6 py-8 text-center',
      className,
    )}
    role="alert"
  >
    <h3 className="text-lg font-semibold text-error-800">{title}</h3>
    {message ? <p className="mt-2 text-sm text-error-700">{message}</p> : null}
    {onRetry ? (
      <Button type="button" variant="secondary" className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    ) : null}
  </div>
);
