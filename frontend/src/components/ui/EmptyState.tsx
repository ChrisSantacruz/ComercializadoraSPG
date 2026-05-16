import React from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-12 text-center',
      className,
    )}
  >
    {icon ? <div className="mb-4 text-primary-600">{icon}</div> : null}
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {description ? <p className="mt-2 max-w-md text-sm text-gray-600">{description}</p> : null}
    {actionLabel && onAction ? (
      <Button type="button" className="mt-6" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);
