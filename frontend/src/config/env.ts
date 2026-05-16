const raw = process.env.REACT_APP_API_URL?.trim();

/** Single canonical API origin for the browser client */
export const API_ORIGIN = raw && raw.length > 0 ? raw.replace(/\/$/, '') : 'http://localhost:5001';

export const API_BASE = `${API_ORIGIN}/api`;

/** Log level for `lib/observability/logger` — optional; defaults: warn in prod, debug in dev */
export const LOG_LEVEL = process.env.REACT_APP_LOG_LEVEL;

/** Explicit production flag (same as NODE_ENV checks elsewhere) */
export const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';
