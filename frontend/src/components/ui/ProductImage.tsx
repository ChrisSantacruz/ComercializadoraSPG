import React, { useState, useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { getImageUrl } from '../../utils/imageUtils';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/cn';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

function resolvedUrl(input: string | null | undefined, fallback: string): string {
  if (input == null || String(input).trim() === '') return fallback;
  return getImageUrl(input);
}

const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackSrc = '/images/default-product.svg',
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState(() => resolvedUrl(src, fallbackSrc));
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const next = resolvedUrl(src, fallbackSrc);
    setImageSrc(next);
    setIsLoading(true);
    setHasError(false);
  }, [src, fallbackSrc]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);

    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setIsLoading(true);
    }

    onError?.();
  };

  const safeSrc = imageSrc && String(imageSrc).trim() !== '' ? imageSrc : fallbackSrc;

  return (
    <div className="relative h-full w-full min-h-0">
      {isLoading ? <Skeleton className="absolute inset-0 rounded-none" aria-hidden /> : null}

      <img
        src={safeSrc}
        alt={alt}
        className={cn(
          className,
          'transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100',
        )}
        loading={loading}
        decoding="async"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {hasError && safeSrc === fallbackSrc ? (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-500"
          aria-hidden
        >
          <PhotoIcon className="h-8 w-8 text-gray-400" />
          <span className="text-xs font-medium">Sin imagen</span>
        </div>
      ) : null}
    </div>
  );
};

export default ProductImage;
