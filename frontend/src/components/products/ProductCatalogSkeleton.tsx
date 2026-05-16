import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ProductCatalogSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-soft"
        aria-hidden
      >
        <Skeleton className="h-52 w-full rounded-none sm:h-56" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <div className="flex justify-between pt-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-11" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
