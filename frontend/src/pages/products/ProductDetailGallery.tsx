import React, { useCallback, useRef, useState } from 'react';
import { ArrowsPointingOutIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ProductImage from '../../components/ui/ProductImage';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/cn';

export type GalleryImage = { url: string; alt: string; rawSrc?: string | null };

type ProductDetailGalleryProps = {
  images: GalleryImage[];
  productName: string;
};

export const ProductDetailGallery: React.FC<ProductDetailGalleryProps> = ({ images, productName }) => {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const safeIndex = (i: number) => (count <= 0 ? 0 : ((i % count) + count) % count);

  const go = (delta: number) => {
    if (count <= 1) return;
    setSelected((prev) => safeIndex(prev + delta));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null || count <= 1) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (dx > 56) go(-1);
    else if (dx < -56) go(1);
  };

  const current = images[selected] ?? images[0];

  const thumbScrollRef = useRef<HTMLDivElement>(null);

  const scrollThumbIntoView = useCallback((index: number) => {
    const el = thumbScrollRef.current?.children.item(index) as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  const select = (index: number) => {
    setSelected(safeIndex(index));
    scrollThumbIntoView(safeIndex(index));
  };

  if (!current) {
    return (
      <div className="aspect-square w-full rounded-xl border border-gray-200 bg-gray-50" aria-hidden />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="group relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-soft"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className="relative block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          onClick={() => count > 0 && setLightboxOpen(true)}
          aria-label={`Ampliar imagen de ${productName}`}
        >
          <ProductImage
            src={current.rawSrc ?? current.url}
            alt={current.alt}
            className="h-full w-full object-contain"
            loading="eager"
          />
        </button>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 z-dropdown hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2 text-gray-700 shadow-soft transition hover:bg-white md:flex"
              aria-label="Imagen anterior"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 z-dropdown hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2 text-gray-700 shadow-soft transition hover:bg-white md:flex"
              aria-label="Imagen siguiente"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-gray-200 bg-white/95 px-2 py-1 text-xs font-medium text-gray-600 opacity-0 shadow-sm transition group-hover:opacity-100 md:opacity-100">
          <span className="inline-flex items-center gap-1">
            <ArrowsPointingOutIcon className="h-3.5 w-3.5" aria-hidden />
            Ver
          </span>
        </div>
      </div>

      {count > 1 ? (
        <div
          ref={thumbScrollRef}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Miniaturas de producto"
        >
          {images.map((img, index) => (
            <button
              key={`${img.url}-${index}`}
              type="button"
              role="tab"
              aria-selected={selected === index}
              onClick={() => select(index)}
              className={cn(
                'relative h-16 w-16 shrink-0 snap-center overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-20',
                selected === index ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <ProductImage
                src={img.rawSrc ?? img.url}
                alt={`Miniatura ${index + 1} de ${productName}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}

      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={productName}
        description="Vista ampliada"
        size="lg"
        className="max-w-4xl"
      >
        <div className="relative aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-lg bg-gray-50">
          <ProductImage
            src={current.rawSrc ?? current.url}
            alt={current.alt}
            className="h-full w-full object-contain"
            loading="eager"
          />
          {count > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2 shadow-soft"
                onClick={() => go(-1)}
                aria-label="Anterior"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2 shadow-soft"
                onClick={() => go(1)}
                aria-label="Siguiente"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
