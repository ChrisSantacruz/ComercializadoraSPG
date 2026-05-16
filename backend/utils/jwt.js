const jwt = require('jsonwebtoken');

const JWT_ALG = 'HS256';
const VERIFY_OPTS = { algorithms: [JWT_ALG] };

const accessSecret = () => process.env.JWT_SECRET;
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// Generar token JWT (access / misc)
const generarToken = (payload, expiresIn = '30d') => {
  return jwt.sign(payload, accessSecret(), {
    expiresIn,
    algorithm: JWT_ALG
  });
};

// Verificar token JWT de acceso (mismo secreto que generarToken)
const verificarToken = (token) => {
  return jwt.verify(token, accessSecret(), VERIFY_OPTS);
};

const verificarRefreshToken = (token) => {
  return jwt.verify(token, refreshSecret(), VERIFY_OPTS);
};

// Decodificar token sin verificar (útil para obtener info expirada)
const decodificarToken = (token) => {
  return jwt.decode(token);
};

// Generar token de acceso (API)
const generarTokenAcceso = (usuarioId, rol) => {
  return generarToken(
    {
      id: usuarioId,
      rol: rol ?? null
    },
    '7d'
  );
};

// Generar token de actualización (rotación en cliente; secreto puede diferir)
const generarTokenActualizacion = (usuarioId) => {
  return jwt.sign(
    {
      id: usuarioId,
      tipo: 'refresh'
    },
    refreshSecret(),
    { expiresIn: '30d', algorithm: JWT_ALG }
  );
};

// Token corto para completar selección de rol tras OAuth (no sustituye sesión)
const generarTokenSeleccionRol = (usuarioId) => {
  return jwt.sign(
    {
      id: usuarioId,
      tipo: 'rol_pending'
    },
    accessSecret(),
    { expiresIn: '15m', algorithm: JWT_ALG }
  );
};

const verificarTokenSeleccionRol = (token) => {
  const decoded = jwt.verify(token, accessSecret(), VERIFY_OPTS);
  if (decoded.tipo !== 'rol_pending') {
    const err = new Error('Token de selección de rol inválido');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
};

// Generar token de verificación de email
const generarTokenVerificacion = (usuarioId, email) => {
  return generarToken(
    {
      id: usuarioId,
      email: email,
      tipo: 'verificacion'
    },
    '24h'
  );
};

// Generar token de recuperación de contraseña
const generarTokenRecuperacion = (usuarioId, email) => {
  return generarToken(
    {
      id: usuarioId,
      email: email,
      tipo: 'recuperacion'
    },
    '1h'
  );
};

// Extraer token del header Authorization
const extraerTokenDelHeader = (authHeader) => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Establecer token en cookie
const establecerTokenEnCookie = (res, token, httpOnly = true) => {
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    httpOnly: httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('token', token, options);
};

// Limpiar cookie de token
const limpiarTokenDeCookie = (res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

module.exports = {
  generarToken,
  verificarToken,
  verificarRefreshToken,
  decodificarToken,
  generarTokenAcceso,
  generarTokenActualizacion,
  generarTokenSeleccionRol,
  verificarTokenSeleccionRol,
  generarTokenVerificacion,
  generarTokenRecuperacion,
  extraerTokenDelHeader,
  establecerTokenEnCookie,
  limpiarTokenDeCookie
};
