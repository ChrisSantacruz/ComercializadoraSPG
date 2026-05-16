import React from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const map: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-800 ring-gray-200',
  primary: 'bg-primary-50 text-primary-800 ring-primary-100',
  success: 'bg-success-50 text-success-800 ring-success-100',
  warning: 'bg-warning-50 text-warning-800 ring-warning-100',
  error: 'bg-error-50 text-error-800 ring-error-100',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      map[variant],
      className,
    )}
    {...rest}
  />
);
