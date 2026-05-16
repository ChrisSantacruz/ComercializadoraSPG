import React from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  return (
    <nav
      className={cn('flex items-center justify-center gap-2', className)}
      aria-label="Paginación"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(prev)}
      >
        Anterior
      </Button>
      <span className="text-sm text-gray-600">
        Página <span className="font-medium text-gray-900">{page}</span> de{' '}
        <span className="font-medium text-gray-900">{totalPages}</span>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(next)}
      >
        Siguiente
      </Button>
    </nav>
  );
};
