import React, { ChangeEvent, DragEvent, useRef, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ImagePreview } from './types';
import ProductImage from '../../ui/ProductImage';

interface ImageDropzoneProps {
  images: ImagePreview[];
  existingImages?: string[];
  disabled?: boolean;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage: (id: string, direction: -1 | 1) => void;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  images,
  existingImages = [],
  disabled,
  onAddImages,
  onRemoveImage,
  onMoveImage,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    onAddImages(Array.from(fileList).filter((file) => file.type.startsWith('image/')));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Subir imágenes del producto"
        aria-disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition ${
          isDragging
            ? 'border-primary-500 bg-primary-50/80 ring-2 ring-primary-500/20'
            : 'border-gray-300 bg-gray-50/70 hover:border-primary-300 hover:bg-white'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition group-hover:text-primary-600">
          <ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-950">Arrastra imágenes o selecciona archivos</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
          Usa JPG, PNG o WEBP. La primera imagen nueva será tomada como portada visual del borrador.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="sr-only"
          disabled={disabled}
        />
      </div>

      {existingImages.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Imágenes actuales</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {existingImages.map((image, index) => (
              <div key={`${image}-${index}`} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                <ProductImage src={image} alt={`Imagen actual ${index + 1}`} className="aspect-square w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm">
                  Actual
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            La eliminación de imágenes ya guardadas requiere soporte explícito del API. Las imágenes nuevas sí pueden quitarse antes de guardar.
          </p>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Nuevas imágenes</p>
            <span className="text-xs text-gray-500">{images.length} seleccionada(s)</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <div key={image.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <ProductImage src={image.url} alt={`Vista previa ${index + 1}`} className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gray-950/70 p-2 text-left opacity-100 backdrop-blur-sm sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                  <p className="truncate text-[11px] font-medium text-white">{image.file.name}</p>
                </div>
                {index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    Portada
                  </span>
                ) : null}
                <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onMoveImage(image.id, -1)}
                    disabled={disabled || index === 0}
                    className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm transition hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Subir imagen ${index + 1}`}
                  >
                    <ArrowUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveImage(image.id, 1)}
                    disabled={disabled || index === images.length - 1}
                    className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm transition hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Bajar imagen ${index + 1}`}
                  >
                    <ArrowDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(image.id)}
                    disabled={disabled}
                    className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm transition hover:text-error-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Eliminar imagen ${index + 1}`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Agregar más imágenes"
            >
              <PhotoIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
