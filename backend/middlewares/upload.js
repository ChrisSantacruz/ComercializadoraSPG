const multer = require('multer');
const cloudinary = require('cloudinary');
const multerStorageCloudinary = require('multer-storage-cloudinary');
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;
const path = require('path');
const logger = require('../utils/logger');

// Configurar Cloudinary solo si las credenciales están disponibles
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                     process.env.CLOUDINARY_API_KEY && 
                     process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  // Fix crítico: garantizar que cloudinary.v2 existe para multer-storage-cloudinary
  if (!cloudinary.v2) {
    cloudinary.v2 = cloudinary;
  }
  
  logger.info('upload_cloudinary_ready', { cloud: process.env.CLOUDINARY_CLOUD_NAME });
} else {
  logger.warn('upload_local_storage', { msg: 'Cloudinary no configurado — usando almacenamiento local' });
}

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const error = new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configuración de storage para productos
let productStorage;

if (useCloudinary) {
  try {
    productStorage = new CloudinaryStorage({
      cloudinary: cloudinary.v2,
      params: {
        folder: 'comercializadora-spg/productos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: '80' }
        ],
        format: 'webp'
      }
    });
    console.log('✅ Storage de productos configurado con Cloudinary');
  } catch (error) {
    console.error('❌ Error configurando storage de productos con Cloudinary:', error);
    // Fallback a almacenamiento local si hay error
    productStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/productos');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  }
} else {
  // Almacenamiento local como fallback
  productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/productos');
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Configuración de storage para avatares
let avatarStorage;

if (useCloudinary) {
  try {
    avatarStorage = new CloudinaryStorage({
      cloudinary: cloudinary.v2,
      params: {
        folder: 'comercializadora-spg/avatares',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: '80' }
        ],
        format: 'webp'
      }
    });
    console.log('✅ Storage de avatares configurado con Cloudinary');
  } catch (error) {
    console.error('❌ Error configurando storage de avatares:', error);
    avatarStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/avatares');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  }
} else {
  // Almacenamiento local como fallback
  avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/avatares');
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Configuración de storage para categorías
let categoryStorage;

if (useCloudinary) {
  try {
    categoryStorage = new CloudinaryStorage({
      cloudinary: cloudinary.v2,
      params: {
        folder: 'comercializadora-spg/categorias',
        allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
        transformation: [
          { width: 400, height: 400, crop: 'limit', quality: '80' }
        ],
        format: 'webp'
      }
    });
    console.log('✅ Storage de categorías configurado con Cloudinary');
  } catch (error) {
    console.error('❌ Error configurando storage de categorías:', error);
    categoryStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/categorias');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  }
} else {
  categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/categorias');
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Configuración de storage para reseñas (imágenes)
let reviewStorage;

if (useCloudinary) {
  try {
    reviewStorage = new CloudinaryStorage({
      cloudinary: cloudinary.v2,
      params: {
        folder: 'comercializadora-spg/reseñas',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
          { width: 600, height: 600, crop: 'limit', quality: '80' }
        ],
        format: 'webp'
      }
    });
    console.log('✅ Storage de reseñas configurado con Cloudinary');
  } catch (error) {
    console.error('❌ Error configurando storage de reseñas:', error);
    reviewStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/reseñas');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  }
} else {
  reviewStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/reseñas');
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Configuración de storage para videos de reseñas
let reviewVideoStorage;

if (useCloudinary) {
  try {
    reviewVideoStorage = new CloudinaryStorage({
      cloudinary: cloudinary.v2,
      params: {
        folder: 'comercializadora-spg/reseñas/videos',
        allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
        resource_type: 'video',
        transformation: [
          { width: 1280, crop: 'limit', quality: '80' }
        ]
      }
    });
    console.log('✅ Storage de videos de reseñas configurado con Cloudinary');
  } catch (error) {
    console.error('❌ Error configurando storage de videos:', error);
    reviewVideoStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/reseñas/videos');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'review-video-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  }
} else {
  reviewVideoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/reseñas/videos');
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'review-video-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Middleware para subir imágenes de productos
const subirImagenesProducto = multer({
  storage: productStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // máximo 10 archivos
  }
}).array('imagenes', 10);

// Middleware para subir imagen principal de producto
const subirImagenPrincipalProducto = multer({
  storage: productStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('imagenPrincipal');

// Middleware para subir avatar de usuario
const subirAvatar = multer({
  storage: avatarStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
}).single('avatar');

// Middleware para subir banner de comerciante
const subirBanner = multer({
  storage: productStorage, // Reutilizamos el storage de productos
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('banner');

// Middleware para subir imagen de categoría
const subirImagenCategoria = multer({
  storage: categoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB
  }
}).single('imagen');

// Middleware para subir imágenes de reseña
const subirImagenesReseña = multer({
  storage: reviewStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
    files: 5 // máximo 5 archivos
  }
}).array('imagenes', 5);

// Middleware para manejar errores de multer
const manejarErroresSubida = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          exito: false,
          mensaje: 'El archivo es demasiado grande'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          exito: false,
          mensaje: 'Demasiados archivos'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          exito: false,
          mensaje: 'Campo de archivo inesperado'
        });
      default:
        return res.status(400).json({
          exito: false,
          mensaje: 'Error en la subida de archivo'
        });
    }
  }
  
  if (error && error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      exito: false,
      mensaje: error.message
    });
  }
  
  next(error);
};

// Función para eliminar imagen de Cloudinary
const eliminarImagen = async (publicId) => {
  if (!useCloudinary) {
    console.warn('⚠️  Cloudinary no configurado - no se puede eliminar imagen');
    return { result: 'not_configured' };
  }
  
  if (!cloudinary.v2 || !cloudinary.v2.uploader) {
    console.error('❌ cloudinary.v2.uploader no está disponible');
    throw new Error('Cloudinary no está correctamente configurado');
  }
  
  try {
    const resultado = await cloudinary.v2.uploader.destroy(publicId);
    return resultado;
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    throw error;
  }
};

// Función para eliminar múltiples imágenes
const eliminarMultiplesImagenes = async (publicIds) => {
  if (!useCloudinary) {
    console.warn('⚠️  Cloudinary no configurado - no se pueden eliminar imágenes');
    return { result: 'not_configured' };
  }
  
  if (!cloudinary.v2 || !cloudinary.v2.api) {
    console.error('❌ cloudinary.v2.api no está disponible');
    throw new Error('Cloudinary no está correctamente configurado');
  }
  
  try {
    const resultado = await cloudinary.v2.api.delete_resources(publicIds);
    return resultado;
  } catch (error) {
    console.error('Error eliminando múltiples imágenes:', error);
    throw error;
  }
};

// Middleware wrapper para manejar la subida con manejo de errores
const crearMiddlewareSubida = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        return manejarErroresSubida(error, req, res, next);
      }
      next();
    });
  };
};

// Multer instance para videos de reseñas
const subirVideosReseña = multer({
  storage: reviewVideoStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB para videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /video\/(mp4|quicktime|x-msvideo|webm)/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const error = new Error('Solo se permiten videos (mp4, mov, avi, webm)');
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  }
}).array('videos', 2); // Máximo 2 videos por reseña

module.exports = {
  cloudinary: useCloudinary ? cloudinary.v2 : null,
  cloudinaryV2: useCloudinary ? cloudinary.v2 : null,
  useCloudinary,
  subirImagenesProducto: crearMiddlewareSubida(subirImagenesProducto),
  subirImagenPrincipalProducto: crearMiddlewareSubida(subirImagenPrincipalProducto),
  subirAvatar: crearMiddlewareSubida(subirAvatar),
  subirBanner: crearMiddlewareSubida(subirBanner),
  subirImagenCategoria: crearMiddlewareSubida(subirImagenCategoria),
  subirImagenesReseña: crearMiddlewareSubida(subirImagenesReseña),
  subirVideosReseña: crearMiddlewareSubida(subirVideosReseña),
  eliminarImagen,
  eliminarMultiplesImagenes,
  manejarErroresSubida
}; 