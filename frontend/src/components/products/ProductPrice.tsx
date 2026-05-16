import React from 'react';
import { cn } from '../../lib/cn';

export interface ProductPriceProps {
  amount: number;
  className?: string;
  compareAt?: number;
}

export const ProductPrice: React.FC<ProductPriceProps> = ({
  amount,
  className,
  compareAt,
}) => {
  const formatted = amount.toLocaleString('es-CO');
  const showCompare =
    typeof compareAt === 'number' && compareAt > amount && compareAt > 0;

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {showCompare ? (
        <span className="text-xs font-medium text-gray-400 line-through tabular-nums">
          ${compareAt.toLocaleString('es-CO')}
        </span>
      ) : null}
      <span className="text-lg font-semibold tabular-nums tracking-tight text-gray-900">
        ${formatted}
      </span>
    </div>
  );
};
