import React from 'react';
import { cn } from '../../lib/cn';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-gray-300 text-primary-600',
        'focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
        className,
      )}
      {...rest}
    />
  ),
);

Checkbox.displayName = 'Checkbox';
