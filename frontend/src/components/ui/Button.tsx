import React from 'react';
import { cn } from '../../lib/cn';
import LoadingSpinner from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-secondary-500 text-white hover:bg-secondary-600 focus-visible:ring-secondary-400 disabled:bg-secondary-300',
  secondary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-400 disabled:bg-primary-300',
  outline:
    'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-primary-400',
  ghost: 'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-300',
  danger:
    'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-400 disabled:bg-error-300',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-11 px-5 text-base rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      className,
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const spinnerColor =
      variant === 'ghost' || variant === 'outline' ? 'gray' : 'white';
    return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoadingSpinner size="sm" color={spinnerColor} /> : null}
      {children}
    </button>
    );
  },
);

Button.displayName = 'Button';
