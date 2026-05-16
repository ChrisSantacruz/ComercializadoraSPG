import React from 'react';
import { cn } from '../../lib/cn';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  padded?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  padded = true,
  className,
  children,
  ...rest
}) => (
  <section
    className={cn(padded && 'py-10 sm:py-12 lg:py-14', className)}
    {...rest}
  >
    {children}
  </section>
);
