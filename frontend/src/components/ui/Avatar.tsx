import React from 'react';
import { cn } from '../../lib/cn';

export interface AvatarProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}) => {
  const [broken, setBroken] = React.useState(false);
  const initials =
    fallback ||
    alt
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') ||
    '?';

  const url = src != null && String(src).trim() !== '' ? String(src).trim() : undefined;
  const showImg = Boolean(url) && !broken;

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-800 ring-2 ring-white',
        sizeMap[size],
        className,
      )}
    >
      {showImg ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
};
