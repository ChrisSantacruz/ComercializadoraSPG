import React from 'react';
import { cn } from '../../lib/cn';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 border-gray-300 text-primary-600',
        'focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
        className,
      )}
      {...rest}
    />
  ),
);

Radio.displayName = 'Radio';
