import React from 'react';
import { cn } from '../../lib/cn';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  ...rest
}) => (
  <div className="w-full overflow-x-auto rounded-xl border border-gray-200">
    <table className={cn('min-w-full divide-y divide-gray-200 text-left text-sm', className)} {...rest} />
  </div>
);

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...rest
}) => <thead className={cn('bg-gray-50', className)} {...rest} />;

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...rest
}) => <tbody className={cn('divide-y divide-gray-100 bg-white', className)} {...rest} />;

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...rest
}) => <tr className={cn('hover:bg-gray-50/80', className)} {...rest} />;

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...rest
}) => (
  <th
    scope="col"
    className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600', className)}
    {...rest}
  />
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...rest
}) => <td className={cn('whitespace-nowrap px-4 py-3 text-gray-800', className)} {...rest} />;
