'use strict';

/**
 * Structured logging for production aggregators (JSON lines).
 * Redacts common secret fields and JWT-shaped strings (DEC-BE-004).
 */
const SECRET_KEY = /password|contrase|token|refresh|secret|authorization|jwt|apikey|api_key|cookie/i;

function redactDeep(value, depth = 0) {
  if (depth > 8) return '[TruncatedDepth]';
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 800) return `${value.slice(0, 240)}…[truncated]`;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return '[JWT]';
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY.test(k)) out[k] = '[REDACTED]';
      else out[k] = redactDeep(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

function emit(level, msg, meta = {}) {
  const entry = redactDeep({
    ts: new Date().toISOString(),
    level,
    msg,
    service: 'comercializadora-api',
    ...meta,
  });
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = {
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', msg, meta);
  },
  redactDeep,
};

module.exports = logger;
