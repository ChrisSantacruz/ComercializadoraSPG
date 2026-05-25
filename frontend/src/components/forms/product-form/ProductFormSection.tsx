import React from 'react';
import { cn } from '../../../lib/cn';

interface ProductFormSectionProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

export const ProductFormSection: React.FC<ProductFormSectionProps> = ({
  id,
  title,
  description,
  children,
  aside,
  className,
}) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className={cn('rounded-2xl border border-gray-200 bg-white shadow-soft', className)}
  >
    <div className="grid gap-5 border-b border-gray-100 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div>
        <h2 id={`${id}-title`} className="text-base font-semibold text-gray-950">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{description}</p>
      </div>
      {aside ? <div className="min-w-0 text-sm text-gray-500">{aside}</div> : null}
    </div>
    <div className="space-y-5 px-4 py-5 sm:px-6">{children}</div>
  </section>
);
