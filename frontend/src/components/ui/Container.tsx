import React from 'react';
import { cn } from '../../lib/cn';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'main' | 'section';
}

export const Container: React.FC<ContainerProps> = ({
  as: Tag = 'div',
  className,
  children,
  ...rest
}) => (
  <Tag className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...rest}>
    {children}
  </Tag>
);
