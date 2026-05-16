/**
 * Shared response-shape helpers — use in controllers to avoid NaN / shape drift (DEC-API-001, DEC-NAM-004).
 */

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function asPositiveInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function asFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  ensureArray,
  asPositiveInt,
  asFiniteNumber,
};
