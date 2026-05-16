/** Coerce API numbers to finite values for money and counts (DEC-FE: no NaN in UI). */
export function safeMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function safeInt(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}
