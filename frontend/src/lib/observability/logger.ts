/**
 * Central logging — DEC observability / no secrets in production logs.
 * Do not use console.* directly in app code; import `log` from here.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function envMinLevel(): LogLevel {
  const raw = process.env.REACT_APP_LOG_LEVEL?.toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return isProd ? 'warn' : 'debug';
}

const minLevel = envMinLevel();

function shouldLog(level: LogLevel): boolean {
  return ORDER[level] >= ORDER[minLevel];
}

const JWT_LIKE = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*/;
const SENSITIVE_KEY = /password|passwd|secret|token|authorization|refresh|cookie/i;

/** Redact values for structured logs (never log raw JWT/passwords). */
export function redactForLogs(input: unknown, depth = 0): unknown {
  if (depth > 6) return '[max-depth]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    if (JWT_LIKE.test(input)) return '[REDACTED_JWT]';
    if (input.length > 800) return `${input.slice(0, 200)}…[truncated]`;
    return input;
  }
  if (typeof input === 'number' || typeof input === 'boolean') return input;
  if (typeof input === 'bigint') return String(input);
  if (input instanceof Error) {
    return {
      name: input.name,
      message: redactForLogs(input.message, depth + 1),
    };
  }
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((x) => redactForLogs(x, depth + 1));
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactForLogs(v, depth + 1);
      }
    }
    return out;
  }
  return '[unserializable]';
}

function formatMessage(context: string | undefined, msg: string): string {
  return context ? `[${context}] ${msg}` : msg;
}

function write(
  level: LogLevel,
  context: string | undefined,
  msg: string,
  meta?: unknown,
): void {
  if (!shouldLog(level)) return;
  const prefix = formatMessage(context, msg);
  const safeMeta = meta !== undefined ? redactForLogs(meta) : undefined;
  /* eslint-disable no-console -- this is the single allowed sink */
  switch (level) {
    case 'debug':
      if (isDev) console.debug(prefix, safeMeta ?? '');
      break;
    case 'info':
      if (!isProd || minLevel === 'info' || minLevel === 'debug') {
        console.info(prefix, safeMeta ?? '');
      }
      break;
    case 'warn':
      console.warn(prefix, safeMeta ?? '');
      break;
    case 'error':
      console.error(prefix, safeMeta ?? '');
      break;
    default:
      break;
  }
  /* eslint-enable no-console */
}

export interface Logger {
  debug: (msg: string, meta?: unknown) => void;
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
  child: (ctx: string) => Logger;
}

function makeLogger(context?: string): Logger {
  return {
    debug: (m, meta) => write('debug', context, m, meta),
    info: (m, meta) => write('info', context, m, meta),
    warn: (m, meta) => write('warn', context, m, meta),
    error: (m, meta) => write('error', context, m, meta),
    child: (ctx) => makeLogger(context ? `${context}:${ctx}` : ctx),
  };
}

/** Application root logger */
export const log = makeLogger();

/** True when verbose tracing is appropriate (dev only unless REACT_APP_LOG_LEVEL=debug). */
export function isVerboseLogging(): boolean {
  return minLevel === 'debug';
}
