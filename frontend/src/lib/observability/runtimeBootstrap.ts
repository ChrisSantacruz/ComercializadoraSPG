import { log, redactForLogs } from './logger';

let installed = false;

/**
 * Global error handlers — avoid silent unhandled rejections in production telemetry hooks.
 */
export function installRuntimeHandlers(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    log.error('window.error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error ? redactForLogs(String(event.error)) : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason =
      event.reason instanceof Error
        ? { name: event.reason.name, message: event.reason.message }
        : redactForLogs(event.reason);
    log.error('unhandledrejection', reason);
    // Keep default browser logging in dev for stack inspection
    if (process.env.NODE_ENV === 'development') {
      return;
    }
  });
}
