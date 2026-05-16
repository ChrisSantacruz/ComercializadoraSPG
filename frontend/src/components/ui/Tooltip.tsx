import React from 'react';
import { cn } from '../../lib/cn';

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
  className?: string;
}

/** Lightweight tooltip: use for supplementary text; prefer visible labels for critical info. */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const child = React.Children.only(children);
  const existing = (child.props as { title?: string }).title;
  return (
    <span className={cn('group relative inline-flex', className)}>
      {React.cloneElement(child, { title: existing ?? content } as never)}
    </span>
  );
};
