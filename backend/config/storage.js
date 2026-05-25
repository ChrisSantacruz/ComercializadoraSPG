/**
 * Configuración de almacenamiento de medios.
 * Por defecto: local (desarrollo / staging / QA).
 * Cloudinary solo si STORAGE_DRIVER=cloudinary y credenciales válidas.
 */
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

const hasCloudinaryCreds =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

const useCloudinary = STORAGE_DRIVER === 'cloudinary' && hasCloudinaryCreds;

const UPLOADS_ROOT = process.env.UPLOADS_ROOT || 'uploads';

const PRODUCT_IMAGE_DIR = 'products';
const PRODUCT_VIDEO_DIR = 'videos';

const LIMITS = {
  imageMaxBytes: Number(process.env.MEDIA_IMAGE_MAX_MB || 5) * 1024 * 1024,
  videoMaxBytes: Number(process.env.MEDIA_VIDEO_MAX_MB || 50) * 1024 * 1024,
  maxImages: Number(process.env.MEDIA_MAX_IMAGES || 10),
  maxVideos: Number(process.env.MEDIA_MAX_VIDEOS || 3),
};

module.exports = {
  STORAGE_DRIVER,
  useCloudinary,
  UPLOADS_ROOT,
  PRODUCT_IMAGE_DIR,
  PRODUCT_VIDEO_DIR,
  LIMITS,
};
