const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importar configuración de base de datos
const connectDB = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const commerceRoutes = require('./routes/commerceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const addressRoutes = require('./routes/addressRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const wompiRoutes = require('./routes/wompi');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Importar middlewares
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const requestContext = require('./middlewares/requestContext');
const logger = require('./utils/logger');
const wompiService = require('./services/wompiService');
const { ensureActiveCategories } = require('./services/categorySeedService');

// Variables por defecto locales — alinear con frontend `config/env` (API 5001) y `.env.example`
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/comercializadora_spg';
}

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    logger.error('env_invalid', { msg: 'JWT_SECRET is required in production' });
    process.exit(1);
  }
  process.env.JWT_SECRET = 'local-dev-only-unsafe-set-JWT_SECRET-in-backend-env';
  logger.warn('jwt_dev_fallback', {
    msg: 'JWT_SECRET missing; using dev-only placeholder. Copy backend/.env.example → .env and set JWT_SECRET.',
  });
}

if (!process.env.PORT) {
  process.env.PORT = '5001';
}

// Importar configuración de Passport
const passport = require('./config/passport');

// Configuración de la aplicación
const app = express();
const PORT = Number(process.env.PORT) || 5001;

try {
  wompiService.validateStartupConfig({ failFast: isProduction });
} catch (error) {
  logger.error('startup_wompi_config_failed', { message: error.message });
  process.exit(1);
}

// Configurar trust proxy para Render (necesario para rate limiting y CORS)
app.set('trust proxy', 1);

app.use(requestContext);

// Middlewares de seguridad
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    ...(isProduction
      ? {
          hsts: { maxAge: 31536000, includeSubDomains: true, preload: false },
        }
      : {}),
  }),
);
app.use(compression());

// Rate limiting — production default tighter (override via RATE_LIMIT_MAX)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? Math.max(60, Number(process.env.RATE_LIMIT_MAX || 400)) : 1000,
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
app.use('/api/', limiter);

// Middleware para manejar errores de rate limiting
app.use((err, req, res, next) => {
  if (err.status === 429) {
    return res.status(429).json({
      exito: false,
      mensaje: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  }
  next(err);
});

// Middlewares generales
app.use(morgan('combined'));
app.use('/api/wompi/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS — production: whitelist only (DEC-AUTH-001 / staging hardening)
const allowedOrigins = [
  'http://localhost:3000',
  'https://andinoexpress.com',
  'https://www.andinoexpress.com',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
]
  .filter(Boolean)
  .map((o) => String(o).replace(/\/$/, ''));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      if (isProduction && process.env.CORS_ALLOW_NO_ORIGIN !== 'true') {
        logger.warn('cors_missing_origin', {});
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    }
    const normalized = String(origin).replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) {
      if (!isProduction) logger.debug('cors_allowed', { origin: normalized });
      return callback(null, true);
    }
    logger.warn('cors_blocked', { origin: normalized });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Request-Id',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Signature',
    'X-Timestamp',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-Id'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400,
};

function isAdminBootstrapRequest(req) {
  return (
    process.env.ENABLE_ADMIN_BOOTSTRAP === 'true' &&
    req.path === '/api/admin/bootstrap-superadmin' &&
    ['GET', 'POST', 'OPTIONS'].includes(req.method)
  );
}

app.use((req, res, next) => {
  if (isAdminBootstrapRequest(req)) {
    res.setHeader('Vary', 'Origin');
    return next();
  }
  return cors(corsOptions)(req, res, next);
});

// Manejador explícito de preflight OPTIONS
app.options('*', (req, res, next) => {
  if (isAdminBootstrapRequest(req)) {
    return res.sendStatus(200);
  }
  return cors(corsOptions)(req, res, next);
});

// Archivos estáticos pasan por la misma política CORS; no se permite wildcard.
app.use(['/api/uploads', '/uploads'], cors(corsOptions));

// Middleware de logging específico para rutas sensibles — sin credenciales en logs
function redactBody(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitive = /password|contrase|token|refresh|secret|authorization|jwt/i;
  const next = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const k of Object.keys(next)) {
    if (sensitive.test(k)) next[k] = '[REDACTED]';
  }
  return next;
}

app.use((req, res, next) => {
  if (req.url.includes('/wompi/') || req.url.includes('/auth/')) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('sensitive_route', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        body:
          req.body && Object.keys(req.body).length > 0 ? redactBody(req.body) : undefined,
        hasAuthHeader: Boolean(req.headers.authorization),
      });
    } else {
      logger.info('sensitive_route', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
      });
    }
  }
  next();
});

// Configuración de Passport
app.use(passport.initialize());

// Servir archivos estáticos (imágenes subidas) - Configuración mejorada
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // Configurar cache para optimizar carga de imágenes
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
    }
  }
}));

// Ruta adicional para archivos estáticos sin prefijo /api
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Conectar a la base de datos
connectDB()
  .then(() => ensureActiveCategories({ reason: 'startup' }))
  .catch((error) => {
    logger.error('startup_category_bootstrap_failed', { message: error.message });
  });

// Rutas principales
app.get('/', (req, res) => {
  res.json({
    message: 'Comercializadora SPG API',
    version: '1.0.0',
    status: 'Activo',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      categories: '/api/categories',
      admin: '/api/admin',
      commerce: '/api/commerce',
      payments: '/api/payments',
      addresses: '/api/addresses'
    }
  });
});

// Liveness / readiness lightweight (load balancers)
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    mongo: { readyState: dbState, connected: dbOk },
  });
});

// API Routes (después de la ruta temporal)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/commerce', commerceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wompi', wompiRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/admin', adminRoutes);

// Middlewares de manejo de errores
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info('server_listen', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  logger.error('unhandled_rejection', {
    message: err && err.message ? err.message : String(err),
  });
});

module.exports = app; 