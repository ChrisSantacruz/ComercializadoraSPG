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

/**
 * Standard error JSON: { exito, mensaje, codigo?, accion?, errores?, requestId? }
 */
function sendApiError(res, options = {}) {
  const {
    status = 400,
    mensaje = 'Error en la solicitud',
    codigo,
    accion,
    errores,
    requestId = res.req?.requestId,
  } = options;

  const body = {
    exito: false,
    mensaje,
  };
  if (codigo) body.codigo = codigo;
  if (accion) body.accion = accion;
  if (errores) body.errores = errores;
  if (requestId) body.requestId = requestId;

  return res.status(status).json(body);
}

function sendCommerceError(res, err, fallbackMensaje = 'No se pudo completar la operación') {
  if (err?.statusCode) {
    return sendApiError(res, {
      status: err.statusCode,
      mensaje: err.message || fallbackMensaje,
      codigo: err.codigo,
      accion: err.accion,
      requestId: res.req?.requestId,
    });
  }
  return null;
}

module.exports = {
  ensureArray,
  asPositiveInt,
  asFiniteNumber,
  sendApiError,
  sendCommerceError,
};
