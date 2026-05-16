/**
 * SPA auth lifecycle events (avoid window.location for session loss).
 * AuthProvider subscribes and navigates with React Router.
 */
export const AUTH_SESSION_LOST = 'app:auth-session-lost';

export function emitAuthSessionLost(detail?: { reason?: string }) {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_LOST, { detail }));
}
