const multer = require('multer');
const path = require('path');
const { applyCorsHeaders } = require('./corsConfig');
const { LIMITS } = require('../config/storage');
const { createDiskStorage, cleanupUploadedFiles } = require('../services/localMediaStorage');
const logger = require('../utils/logger');

const IMAGE_MIME = /^image\/(jpeg|jpg|png|gif|webp)$/i;
const VIDEO_MIME = /^video\/(mp4|quicktime|x-msvideo|webm)$/i;

const imageExt = /\.(jpe?g|png|gif|webp)$/i;
const videoExt = /\.(mp4|mov|avi|webm)$/i;

function imageFileFilter(_req, file, cb) {
  const ok = IMAGE_MIME.test(file.mimetype) && imageExt.test(path.extname(file.originalname).toLowerCase());
  if (ok) return cb(null, true);
  const err = new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)');
  err.code = 'INVALID_FILE_TYPE';
  cb(err, false);
}

function videoFileFilter(_req, file, cb) {
  const ok = VIDEO_MIME.test(file.mimetype) && videoExt.test(path.extname(file.originalname).toLowerCase());
  if (ok) return cb(null, true);
  const err = new Error('Solo se permiten videos (mp4, mov, avi, webm)');
  err.code = 'INVALID_FILE_TYPE';
  cb(err, false);
}

const uploadImages = multer({
  storage: createDiskStorage('image'),
  fileFilter: imageFileFilter,
  limits: { fileSize: LIMITS.imageMaxBytes, files: LIMITS.maxImages },
}).array('imagenes', LIMITS.maxImages);

const uploadVideos = multer({
  storage: createDiskStorage('video'),
  fileFilter: videoFileFilter,
  limits: { fileSize: LIMITS.videoMaxBytes, files: LIMITS.maxVideos },
}).array('videos', LIMITS.maxVideos);

/**
 * Procesa imagenes y videos en secuencia (mismo request multipart).
 */
function subirMediaProducto(req, res, next) {
  uploadImages(req, res, (imageErr) => {
    if (imageErr) return sendUploadError(imageErr, req, res);
    const imageFiles = [...(req.files || [])];
    uploadVideos(req, res, (videoErr) => {
      if (videoErr) {
        cleanupUploadedFiles(imageFiles);
        return sendUploadError(videoErr, req, res);
      }
      req.productImageFiles = imageFiles;
      req.productVideoFiles = req.files || [];
      req.files = [...imageFiles, ...req.productVideoFiles];
      next();
    });
  });
}

function sendUploadError(error, req, res) {
  applyCorsHeaders(req, res);
  cleanupUploadedFiles(req.files || req.productImageFiles || []);

  if (error instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: { status: 413, code: 'FILE_TOO_LARGE', message: 'El archivo excede el tamaño máximo permitido' },
      LIMIT_FILE_COUNT: { status: 400, code: 'TOO_MANY_FILES', message: 'Demasiados archivos en la solicitud' },
      LIMIT_UNEXPECTED_FILE: { status: 400, code: 'UNEXPECTED_FILE_FIELD', message: 'Campo de archivo inesperado' },
    };
    const mapped = map[error.code] || { status: 400, code: 'UPLOAD_FAILED', message: 'Error en la subida de archivo' };
    logger.warn('product_upload_multer_error', { code: error.code, field: error.field });
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

  logger.error('product_upload_unknown_error', { message: error?.message });
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
