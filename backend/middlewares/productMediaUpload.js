const multer = require('multer');
const path = require('path');
const { applyCorsHeaders } = require('./corsConfig');
const { LIMITS } = require('../config/storage');
const {
  UPLOADS_ABS,
  ensureDir,
  uniqueFilename,
  getDestinationFolder,
  cleanupUploadedFiles,
} = require('../services/localMediaStorage');
const logger = require('../utils/logger');

const IMAGE_MIME = /^image\/(jpeg|jpg|png|gif|webp)$/i;
const VIDEO_MIME = /^video\/(mp4|quicktime|x-msvideo|webm)$/i;

const imageExt = /\.(jpe?g|png|gif|webp)$/i;
const videoExt = /\.(mp4|mov|avi|webm)$/i;

const productMediaStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const mediaType = file.fieldname === 'videos' ? 'video' : 'image';
    const dest = path.join(UPLOADS_ABS, getDestinationFolder(mediaType));
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const prefix = file.fieldname === 'videos' ? 'video' : 'img';
    cb(null, `${prefix}-${uniqueFilename(file.originalname)}`);
  },
});

function productFileFilter(_req, file, cb) {
  if (file.fieldname === 'imagenes') {
    const ok = IMAGE_MIME.test(file.mimetype) && imageExt.test(path.extname(file.originalname).toLowerCase());
    if (ok) return cb(null, true);
    const err = new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }

  if (file.fieldname === 'videos') {
    const ok = VIDEO_MIME.test(file.mimetype) && videoExt.test(path.extname(file.originalname).toLowerCase());
    if (ok) return cb(null, true);
    const err = new Error('Solo se permiten videos (mp4, mov, avi, webm)');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }

  const err = new Error(`Campo de archivo no permitido: ${file.fieldname}`);
  err.code = 'LIMIT_UNEXPECTED_FILE';
  cb(err, false);
}

/**
 * Un solo parseo multipart (imagenes + videos). Ejecutar multer dos veces rompe el stream
 * y provoca "Unexpected end of form" en producción.
 */
const uploadProductMedia = multer({
  storage: productMediaStorage,
  fileFilter: productFileFilter,
  limits: {
    fileSize: LIMITS.videoMaxBytes,
    files: LIMITS.maxImages + LIMITS.maxVideos,
    fields: 30,
    parts: 50,
  },
}).fields([
  { name: 'imagenes', maxCount: LIMITS.maxImages },
  { name: 'videos', maxCount: LIMITS.maxVideos },
]);

function flattenUploadedFiles(filesByField) {
  if (!filesByField) return [];
  if (Array.isArray(filesByField)) return filesByField;
  return Object.values(filesByField).flat();
}

function validatePerFileLimits(imageFiles, videoFiles) {
  const tooBigImage = imageFiles.find((f) => f.size > LIMITS.imageMaxBytes);
  if (tooBigImage) {
    const err = new multer.MulterError('LIMIT_FILE_SIZE', 'imagenes');
    err.message = `La imagen "${tooBigImage.originalname}" supera ${LIMITS.imageMaxBytes / (1024 * 1024)} MB`;
    return err;
  }
  const tooBigVideo = videoFiles.find((f) => f.size > LIMITS.videoMaxBytes);
  if (tooBigVideo) {
    const err = new multer.MulterError('LIMIT_FILE_SIZE', 'videos');
    err.message = `El video "${tooBigVideo.originalname}" supera ${LIMITS.videoMaxBytes / (1024 * 1024)} MB`;
    return err;
  }
  return null;
}

function subirMediaProducto(req, res, next) {
  uploadProductMedia(req, res, (error) => {
    if (error) return sendUploadError(error, req, res);

    const imageFiles = req.files?.imagenes || [];
    const videoFiles = req.files?.videos || [];

    const limitError = validatePerFileLimits(imageFiles, videoFiles);
    if (limitError) {
      cleanupUploadedFiles([...imageFiles, ...videoFiles]);
      return sendUploadError(limitError, req, res);
    }

    req.productImageFiles = imageFiles;
    req.productVideoFiles = videoFiles;
    req.files = [...imageFiles, ...videoFiles];
    next();
  });
}

function sendUploadError(error, req, res) {
  applyCorsHeaders(req, res);
  cleanupUploadedFiles(flattenUploadedFiles(req.files));

  if (error instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: { status: 413, code: 'FILE_TOO_LARGE', message: error.message || 'El archivo excede el tamaño máximo permitido' },
      LIMIT_FILE_COUNT: { status: 400, code: 'TOO_MANY_FILES', message: 'Demasiados archivos en la solicitud' },
      LIMIT_UNEXPECTED_FILE: { status: 400, code: 'UNEXPECTED_FILE_FIELD', message: 'Campo de archivo inesperado' },
      LIMIT_PART_COUNT: { status: 400, code: 'UPLOAD_INCOMPLETE', message: 'La solicitud multipart está incompleta' },
    };
    const mapped = map[error.code] || { status: 400, code: 'UPLOAD_FAILED', message: 'Error en la subida de archivo' };
    logger.warn('product_upload_multer_error', { code: error.code, field: error.field, message: error.message });
    return res.status(mapped.status).json({
      exito: false,
      success: false,
      codigo: mapped.code,
      code: mapped.code,
      mensaje: mapped.message,
      message: mapped.message,
    });
  }

  if (error?.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      exito: false,
      success: false,
      codigo: 'INVALID_FILE_TYPE',
      code: 'INVALID_FILE_TYPE',
      mensaje: error.message,
      message: error.message,
    });
  }

  const msg = String(error?.message || '');
  if (/unexpected end of form|multipart/i.test(msg)) {
    logger.warn('product_upload_multipart_truncated', { message: msg });
    return res.status(400).json({
      exito: false,
      success: false,
      codigo: 'UPLOAD_INCOMPLETE',
      code: 'UPLOAD_INCOMPLETE',
      mensaje: 'La subida se interrumpió antes de completarse. Revisa tu conexión o reduce el tamaño de los archivos.',
      message: 'Upload incomplete',
    });
  }

  logger.error('product_upload_unknown_error', { message: msg });
  return res.status(500).json({
    exito: false,
    success: false,
    codigo: 'UPLOAD_FAILED',
    code: 'UPLOAD_FAILED',
    mensaje: 'No se pudo subir el archivo',
    message: 'No se pudo subir el archivo',
  });
}

module.exports = {
  subirMediaProducto,
};
