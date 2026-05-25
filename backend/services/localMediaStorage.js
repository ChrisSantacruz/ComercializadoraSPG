const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { UPLOADS_ROOT, PRODUCT_IMAGE_DIR, PRODUCT_VIDEO_DIR } = require('../config/storage');

const BACKEND_ROOT = path.join(__dirname, '..');
const UPLOADS_ABS = path.join(BACKEND_ROOT, UPLOADS_ROOT);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Sanitiza nombre de archivo para almacenamiento seguro.
 */
function sanitizeFilename(originalName) {
  const ext = path.extname(originalName || '').toLowerCase().slice(0, 8);
  const base = path
    .basename(originalName || 'file', ext)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'file';
  return `${base}${ext}`;
}

function uniqueFilename(originalName) {
  const safe = sanitizeFilename(originalName);
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  const ext = path.extname(safe);
  const name = path.basename(safe, ext);
  return `${name}-${stamp}-${rand}${ext}`;
}

/**
 * Convierte ruta absoluta de disco a URL pública relativa (/uploads/...).
 */
function toPublicUrl(absolutePath) {
  const norm = String(absolutePath).replace(/\\/g, '/');
  const lower = norm.toLowerCase();
  const idx = lower.indexOf('/uploads/');
  if (idx !== -1) return norm.slice(idx);
  const rel = path.relative(UPLOADS_ABS, absolutePath).replace(/\\/g, '/');
  return `/uploads/${rel}`;
}

/**
 * Resuelve ruta relativa /uploads/... a ruta absoluta en disco.
 */
function resolveUploadPath(publicUrl) {
  if (!publicUrl) return null;
  const norm = String(publicUrl).replace(/\\/g, '/');
  if (norm.startsWith('http://') || norm.startsWith('https://')) return null;
  const rel = norm.replace(/^\/uploads\/?/, '');
  return path.join(UPLOADS_ABS, rel);
}

function getDestinationFolder(mediaType) {
  return mediaType === 'video' ? PRODUCT_VIDEO_DIR : PRODUCT_IMAGE_DIR;
}

/**
 * Guarda metadatos de un archivo ya procesado por multer (diskStorage).
 */
function mapMulterFileToMedia(file, index, mediaType, altBase) {
  const publicUrl = file.path ? toPublicUrl(file.path) : `/uploads/${getDestinationFolder(mediaType)}/${file.filename}`;
  return {
    type: mediaType,
    url: publicUrl,
    filename: file.filename || path.basename(publicUrl),
    mimeType: file.mimetype,
    size: file.size,
    order: index,
    publicId: file.public_id || null,
    alt: altBase ? `${altBase} - ${mediaType === 'video' ? 'Video' : 'Imagen'} ${index + 1}` : undefined,
  };
}

/**
 * Elimina archivo local si existe (ignora URLs remotas).
 */
function deleteLocalFile(publicUrl) {
  const abs = resolveUploadPath(publicUrl);
  if (!abs || !fs.existsSync(abs)) return false;
  try {
    fs.unlinkSync(abs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpia archivos subidos cuando falla la operación de negocio.
 */
function cleanupUploadedFiles(files = []) {
  for (const file of files) {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
    }
  }
}

function createDiskStorage(mediaType) {
  const multer = require('multer');
  const folder = getDestinationFolder(mediaType);
  const dest = path.join(UPLOADS_ABS, folder);
  ensureDir(dest);

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      cb(null, `${mediaType === 'video' ? 'video' : 'img'}-${uniqueFilename(file.originalname)}`);
    },
  });
}

module.exports = {
  UPLOADS_ABS,
  ensureDir,
  sanitizeFilename,
  uniqueFilename,
  toPublicUrl,
  resolveUploadPath,
  getDestinationFolder,
  mapMulterFileToMedia,
  deleteLocalFile,
  cleanupUploadedFiles,
  createDiskStorage,
};
