const mongoose = require('mongoose');

/**
 * Esquema canónico de medios (imagen / video).
 * Diseñado para migración futura a S3 / Cloudinary sin cambiar el contrato del frontend.
 */
const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
      min: 0,
    },
    width: Number,
    height: Number,
    duration: Number,
    thumbnail: String,
    order: {
      type: Number,
      default: 0,
    },
    /** Compatibilidad Cloudinary / futuro CDN */
    publicId: String,
    alt: String,
  },
  { _id: true, timestamps: false },
);

module.exports = { mediaSchema };
