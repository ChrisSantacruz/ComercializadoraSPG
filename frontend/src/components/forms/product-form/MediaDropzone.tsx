import React, { ChangeEvent, DragEvent, useRef, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  FilmIcon,
  PhotoIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ProductImage from '../../ui/ProductImage';
import { ExistingMediaItem, MediaPreview } from './types';
import { formatFileSize, getMediaUrl } from '../../../utils/mediaUtils';

interface MediaDropzoneProps {
  images: MediaPreview[];
  videos: MediaPreview[];
  existingMedia?: ExistingMediaItem[];
  disabled?: boolean;
  uploadProgress?: number | null;
  error?: string | null;
  onAddImages: (files: File[]) => void;
  onAddVideos: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onRemoveVideo: (id: string) => void;
  onMoveImage: (id: string, direction: -1 | 1) => void;
  onRemoveExisting?: (mediaId: string) => void;
  onMoveExisting?: (mediaId: string, direction: -1 | 1) => void;
}

export const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  images,
  videos,
  existingMedia = [],
  disabled,
  uploadProgress,
  error,
  onAddImages,
  onAddVideos,
  onRemoveImage,
  onRemoveVideo,
  onMoveImage,
  onRemoveExisting,
  onMoveExisting,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const existingImages = existingMedia.filter((m) => m.type === 'image');
  const existingVideos = existingMedia.filter((m) => m.type === 'video');

  const handleImageFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    onAddImages(Array.from(fileList).filter((f) => f.type.startsWith('image/')));
  };

  const handleVideoFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    onAddVideos(Array.from(fileList).filter((f) => f.type.startsWith('video/')));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    onAddImages(files.filter((f) => f.type.startsWith('image/')));
    onAddVideos(files.filter((f) => f.type.startsWith('video/')));
  };

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700" role="alert">
          {error}
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Subir imágenes y videos del producto"
        aria-disabled={disabled}
        onClick={() => imageInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            imageInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
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
        <p className="mt-3 text-sm font-semibold text-gray-950">Arrastra imágenes o videos, o selecciona archivos</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
          Imágenes: JPG, PNG, WEBP (máx. 5 MB). Videos: MP4, WEBM, MOV (máx. 50 MB). La primera imagen nueva será la portada del borrador.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              imageInputRef.current?.click();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:border-primary-300 hover:text-primary-700"
          >
            <PhotoIcon className="h-4 w-4" aria-hidden="true" />
            Imágenes
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              videoInputRef.current?.click();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:border-primary-300 hover:text-primary-700"
          >
            <FilmIcon className="h-4 w-4" aria-hidden="true" />
            Videos
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            handleImageFiles(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
          disabled={disabled}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            handleVideoFiles(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
          disabled={disabled}
        />
      </div>

      {uploadProgress != null && uploadProgress >= 0 && uploadProgress < 100 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
            <span>Subiendo archivos…</span>
            <span className="font-medium tabular-nums">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {existingImages.length > 0 || existingVideos.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Medios guardados</p>
          {existingImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {existingImages.map((item, index) => (
                <div key={item.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  <ProductImage src={getMediaUrl(item.url)} alt={item.alt || `Imagen ${index + 1}`} className="aspect-square w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm">
                    Guardada
                  </span>
                  {onRemoveExisting || onMoveExisting ? (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      {onMoveExisting ? (
                        <>
                          <button type="button" onClick={() => onMoveExisting(item.id, -1)} disabled={disabled || index === 0} className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm" aria-label="Subir">
                            <ArrowUpIcon className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => onMoveExisting(item.id, 1)} disabled={disabled || index === existingImages.length - 1} className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm" aria-label="Bajar">
                            <ArrowDownIcon className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}
                      {onRemoveExisting ? (
                        <button type="button" onClick={() => onRemoveExisting(item.id)} disabled={disabled} className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm hover:text-error-700" aria-label="Eliminar">
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {existingVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {existingVideos.map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
                  <video src={getMediaUrl(item.url)} className="aspect-video w-full object-cover" controls preload="metadata" />
                  {onRemoveExisting ? (
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(item.id)}
                      disabled={disabled}
                      className="absolute right-2 top-2 rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm"
                      aria-label="Eliminar video"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {images.length > 0 ? (
        <MediaPreviewGrid
          title="Nuevas imágenes"
          items={images}
          disabled={disabled}
          onRemove={onRemoveImage}
          onMove={onMoveImage}
          renderPreview={(item) => <ProductImage src={item.url} alt="" className="aspect-square w-full object-cover" />}
          coverLabel="Portada"
        />
      ) : null}

      {videos.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Nuevos videos ({videos.length})</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((video) => (
              <div key={video.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
                <video src={video.url} className="aspect-video w-full object-cover" controls preload="metadata" />
                <div className="absolute inset-x-0 bottom-0 bg-gray-950/70 p-2 backdrop-blur-sm">
                  <p className="truncate text-[11px] font-medium text-white">{video.file.name}</p>
                  <p className="text-[10px] text-gray-300">{formatFileSize(video.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveVideo(video.id)}
                  disabled={disabled}
                  className="absolute right-2 top-2 rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm hover:text-error-700"
                  aria-label="Eliminar video"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                  <PlayIcon className="h-3 w-3" aria-hidden="true" />
                  Video
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface MediaPreviewGridProps {
  title: string;
  items: MediaPreview[];
  disabled?: boolean;
  coverLabel?: string;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  renderPreview: (item: MediaPreview) => React.ReactNode;
}

const MediaPreviewGrid: React.FC<MediaPreviewGridProps> = ({
  title,
  items,
  disabled,
  coverLabel,
  onRemove,
  onMove,
  renderPreview,
}) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <span className="text-xs text-gray-500">{items.length} seleccionada(s)</span>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <div key={item.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {renderPreview(item)}
          <div className="absolute inset-x-0 bottom-0 bg-gray-950/70 p-2 opacity-100 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100">
            <p className="truncate text-[11px] font-medium text-white">{item.file.name}</p>
            <p className="text-[10px] text-gray-300">{formatFileSize(item.file.size)}</p>
          </div>
          {index === 0 && coverLabel ? (
            <span className="absolute left-2 top-2 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              {coverLabel}
            </span>
          ) : null}
          <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button type="button" onClick={() => onMove(item.id, -1)} disabled={disabled || index === 0} className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm" aria-label="Subir">
              <ArrowUpIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onMove(item.id, 1)} disabled={disabled || index === items.length - 1} className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm" aria-label="Bajar">
              <ArrowDownIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onRemove(item.id)} disabled={disabled} className="rounded-lg bg-white/95 p-1.5 text-gray-600 shadow-sm hover:text-error-700" aria-label="Eliminar">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
