const cors = require('cors');
const logger = require('../utils/logger');

const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://andinoexpress.com',
  'https://www.andinoexpress.com',
];

function buildAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    process.env.CORS_EXTRA_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...STATIC_ALLOWED_ORIGINS, ...fromEnv].map((o) => o.replace(/\/$/, '')))];
}

const allowedOrigins = buildAllowedOrigins();

function isOriginAllowed(origin) {
  if (!origin) return false;
  const normalized = String(origin).replace(/\/$/, '');
  return allowedOrigins.includes(normalized);
}

/** Aplica cabeceras CORS en todas las respuestas (incl. errores 4xx/5xx). */
function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  return true;
}

const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      if (isProduction && process.env.CORS_ALLOW_NO_ORIGIN !== 'true') {
        logger.warn('cors_missing_origin', {});
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    }

    if (isOriginAllowed(origin)) {
      if (!isProduction) logger.debug('cors_allowed', { origin: origin.replace(/\/$/, '') });
      return callback(null, true);
    }

    logger.warn('cors_blocked', { origin: String(origin).replace(/\/$/, '') });
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
  optionsSuccessStatus: 204,
  preflightContinue: false,
  maxAge: 86400,
};

/** CORS antes de rate limit y en preflight explícito. */
function corsMiddleware(req, res, next) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || corsOptions.allowedHeaders.join(','),
    );
    res.setHeader('Access-Control-Max-Age', String(corsOptions.maxAge));
    return res.sendStatus(corsOptions.optionsSuccessStatus);
  }

  return cors(corsOptions)(req, res, next);
}

module.exports = {
  allowedOrigins,
  isOriginAllowed,
  applyCorsHeaders,
  corsOptions,
  corsMiddleware,
};
