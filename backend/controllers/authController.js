const crypto = require('crypto');
const User = require('../models/User');
const OAuthHandoff = require('../models/OAuthHandoff');
const { successResponse, errorResponse } = require('../utils/helpers');
const {
  generarTokenAcceso,
  generarTokenActualizacion,
  generarTokenSeleccionRol,
  generarTokenVerificacion,
  generarTokenRecuperacion,
  establecerTokenEnCookie,
  limpiarTokenDeCookie,
  verificarToken,
  verificarTokenSeleccionRol,
  verificarRefreshToken
} = require('../utils/jwt');
const { enviarEmailBienvenida, enviarEmailRecuperacion } = require('../utils/email');
const { auth } = require('../config/firebaseAdmin');
const logger = require('../utils/logger');

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/registro
// @access  Public
const registrarUsuario = async (req, res, next) => {
  try {
    const { nombre, email, password, telefono, rol = 'cliente', nombreEmpresa } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await User.findOne({ email });
    
    if (usuarioExistente) {
      return errorResponse(res, 'Este email ya está registrado', 400);
    }

    // Crear usuario
    const usuario = new User({
      nombre,
      email,
      password,
      telefono,
      rol,
      nombreEmpresa: rol === 'comerciante' ? nombreEmpresa : undefined,
      proveedor: 'local'
      // No establecer proveedorId para usuarios locales (se queda undefined)
    });

    await usuario.save();

    // Generar código de verificación de 6 dígitos
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Establecer expiración del código (15 minutos)
    const codigoExpiracion = new Date(Date.now() + 15 * 60 * 1000);
    
    // Generar token de verificación (como respaldo)
    const tokenVerificacion = generarTokenVerificacion(usuario._id, email);
    
    // Guardar datos de verificación en el usuario
    usuario.tokenVerificacion = tokenVerificacion;
    usuario.codigoVerificacion = codigoVerificacion;
    usuario.codigoExpiracion = codigoExpiracion;
    await usuario.save();

    // Enviar email de bienvenida con código
    try {
      await enviarEmailBienvenida(email, nombre, codigoVerificacion);
    } catch (emailError) {
      logger.error('auth_welcome_email_failed', { requestId: req.requestId, message: emailError.message });
      // No fallar el registro si el email falla
    }

    successResponse(res, 'Usuario registrado exitosamente. Revisa tu email para obtener el código de verificación.', {
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    }, 201);

  } catch (error) {
    next(error);
  }
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
const iniciarSesion = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario con contraseña
    const usuario = await User.findOne({ email }).select('+password');

    if (!usuario) {
      return errorResponse(res, 'Credenciales inválidas', 401);
    }

    // Verificar contraseña
    const passwordValida = await usuario.compararPassword(password);

    if (!passwordValida) {
      return errorResponse(res, 'Credenciales inválidas', 401);
    }

    // Verificar estado del usuario
    if (usuario.estado === 'bloqueado') {
      return errorResponse(res, 'Tu cuenta ha sido bloqueada. Contacta al administrador.', 403);
    }

    if (usuario.estado === 'inactivo') {
      return errorResponse(res, 'Tu cuenta está inactiva. Verifica tu email para activarla.', 403);
    }

    if (!usuario.verificado) {
      return errorResponse(res, 'Debes verificar tu correo antes de iniciar sesión.', 403);
    }

    // Generar token de acceso
    const token = generarTokenAcceso(usuario._id, usuario.rol);
    const refreshToken = generarTokenActualizacion(usuario._id);

    // Establecer cookie
    establecerTokenEnCookie(res, token);

    // Actualizar fecha de último login
    usuario.fechaUltimoLogin = new Date();
    await usuario.save();

    successResponse(res, 'Sesión iniciada exitosamente', {
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        avatar: usuario.avatar,
        configuracion: usuario.configuracion
      },
      token,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Cerrar sesión
// @route   POST /api/auth/logout
// @access  Private
const cerrarSesion = async (req, res, next) => {
  try {
    // Limpiar cookie
    limpiarTokenDeCookie(res);

    successResponse(res, 'Sesión cerrada exitosamente');

  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/perfil
// @access  Private
const obtenerPerfilActual = async (req, res, next) => {
  try {
    const usuario = await User.findById(req.usuario._id);

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    successResponse(res, 'Perfil obtenido exitosamente', {
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        rol: usuario.rol,
        avatar: usuario.avatar,
        estado: usuario.estado,
        configuracion: usuario.configuracion,
        direccion: usuario.direccion,
        metodosPago: usuario.metodosPago,
        estadisticasComerciante: usuario.estadisticasComerciante,
        fechaCreacion: usuario.fechaCreacion,
        fechaUltimoLogin: usuario.fechaUltimoLogin
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verificar email con código
// @route   POST /api/auth/verificar-codigo
// @access  Public
const verificarEmailConCodigo = async (req, res, next) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return errorResponse(res, 'Email y código son requeridos', 400);
    }

    // Buscar usuario
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return errorResponse(res, 'Código de verificación incorrecto o expirado', 400);
    }

    // Verificar que el código coincida
    if (usuario.codigoVerificacion !== codigo) {
      return errorResponse(res, 'Código de verificación incorrecto o expirado', 400);
    }

    // Verificar que el código no haya expirado
    if (new Date() > usuario.codigoExpiracion) {
      return errorResponse(res, 'Código de verificación incorrecto o expirado', 400);
    }

    // Activar usuario
    usuario.verificado = true;
    usuario.estado = 'activo';
    usuario.fechaVerificacion = new Date();
    usuario.codigoVerificacion = undefined;
    usuario.codigoExpiracion = undefined;
    usuario.tokenVerificacion = undefined;
    await usuario.save();

    // Generar token de acceso
    const token = generarTokenAcceso(usuario._id, usuario.rol);
    const refreshToken = generarTokenActualizacion(usuario._id);

    successResponse(res, 'Email verificado exitosamente. Tu cuenta ha sido activada.', {
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        verificado: usuario.verificado
      },
      token,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Reenviar código de verificación
// @route   POST /api/auth/reenviar-codigo
// @access  Public
const reenviarCodigoVerificacion = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 'Email es requerido', 400);
    }

    // Buscar usuario
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return successResponse(res, 'Si el correo está registrado y pendiente de verificación, recibirás un código.');
    }

    if (usuario.verificado) {
      return errorResponse(res, 'Este usuario ya está verificado', 400);
    }

    // Generar nuevo código de verificación
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    const codigoExpiracion = new Date(Date.now() + 15 * 60 * 1000);

    usuario.codigoVerificacion = codigoVerificacion;
    usuario.codigoExpiracion = codigoExpiracion;
    await usuario.save();

    // Enviar email con nuevo código (de forma asíncrona para evitar bloqueos)
    let mensajeRespuesta = 'Código de verificación generado.';
    
    try {
      // Intentar enviar email con timeout
      const resultadoEmail = await Promise.race([
        enviarEmailBienvenida(email, usuario.nombre, codigoVerificacion),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al procesar envío de email')), 20000)
        )
      ]);
      
      if (resultadoEmail.warning) {
        logger.warn('auth_verification_email_warning', { requestId: req.requestId, warning: resultadoEmail.warning });
        mensajeRespuesta = 'Código generado. El email puede tardar unos minutos en llegar.';
      } else if (resultadoEmail.exito) {
        mensajeRespuesta = 'Código de verificación enviado. Revisa tu email.';
      }
    } catch (emailError) {
      logger.error('auth_verification_email_failed', { requestId: req.requestId, message: emailError.message });
      
      // No fallar la respuesta, solo informar que el email puede tardar
      mensajeRespuesta = `Código generado. Si no recibes el email en unos minutos, inténtalo de nuevo. Error: ${emailError.message}`;
    }

    successResponse(res, mensajeRespuesta, { 
      codigoGenerado: true, 
      email: email,
      validoPor: '15 minutos' 
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verificar email con token (método anterior, mantener compatibilidad)
// @route   POST /api/auth/verificar-email
// @access  Public
const verificarEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(
        errorResponse(res, 'Token de verificación requerido', 400)
      );
    }

    // Verificar token
    let decoded;
    try {
      decoded = verificarToken(token);
    } catch (error) {
      return res.status(400).json(
        errorResponse(res, 'Token inválido o expirado', 400)
      );
    }

    // Verificar que sea token de verificación
    if (decoded.tipo !== 'verificacion') {
      return res.status(400).json(
        errorResponse(res, 'Tipo de token inválido', 400)
      );
    }

    // Buscar usuario
    const usuario = await User.findById(decoded.id);

    if (!usuario) {
      return res.status(404).json(
        errorResponse(res, 'Usuario no encontrado', 400)
      );
    }

    // Verificar que el token coincida
    if (usuario.tokenVerificacion !== token) {
      return res.status(400).json(
        errorResponse(res, 'Token inválido', 400)
      );
    }

    // Activar usuario
    usuario.verificado = true;
    usuario.estado = 'activo';
    usuario.fechaVerificacion = new Date();
    usuario.tokenVerificacion = undefined;
    await usuario.save();

    successResponse(res, 'Email verificado exitosamente. Tu cuenta ha sido activada.');

  } catch (error) {
    next(error);
  }
};

// @desc    Solicitar recuperación de contraseña
// @route   POST /api/auth/recuperar-password
// @access  Public
const solicitarRecuperacionPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Buscar usuario
    const usuario = await User.findOne({ email });

    if (!usuario) {
      // Por seguridad, no revelamos si el email existe o no
      return successResponse(res, 'Si el email existe, recibirás un enlace de recuperación.');
    }

    // Generar token de recuperación
    const tokenRecuperacion = generarTokenRecuperacion(usuario._id, email);

    // Guardar token en el usuario
    usuario.tokenRecuperacion = tokenRecuperacion;
    usuario.fechaRecuperacion = new Date();
    await usuario.save();

    // Enviar email de recuperación
    try {
      await enviarEmailRecuperacion(email, usuario.nombre, tokenRecuperacion);
    } catch (emailError) {
      logger.error('auth_recovery_email_failed', { requestId: req.requestId, message: emailError.message });
      return successResponse(res, 'Si el email existe, recibirás un enlace de recuperación.');
    }

    successResponse(res, 'Si el email existe, recibirás un enlace de recuperación.');

  } catch (error) {
    next(error);
  }
};

// @desc    Restablecer contraseña
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const restablecerPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.body.token;
    const nuevaPassword = req.body.nuevaPassword ?? req.body.newPassword;

    if (!token || !nuevaPassword) {
      return errorResponse(res, 'Token y nueva contraseña son requeridos', 400);
    }

    let decoded;
    try {
      decoded = verificarToken(token);
    } catch (error) {
      return errorResponse(res, 'Token inválido o expirado', 400);
    }

    if (decoded.tipo !== 'recuperacion') {
      return errorResponse(res, 'Tipo de token inválido', 400);
    }

    const usuario = await User.findById(decoded.id);

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    if (usuario.tokenRecuperacion !== token) {
      return errorResponse(res, 'Token inválido', 400);
    }

    usuario.password = nuevaPassword;
    usuario.tokenRecuperacion = undefined;
    usuario.fechaRecuperacion = undefined;
    await usuario.save();

    successResponse(res, 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
  } catch (error) {
    next(error);
  }
};

// @desc    Cambiar contraseña (usuario autenticado)
// @route   PUT /api/auth/cambiar-password
// @access  Private
const cambiarPassword = async (req, res, next) => {
  try {
    const passwordActual = req.body.passwordActual ?? req.body.currentPassword;
    const nuevaPassword = req.body.nuevaPassword ?? req.body.newPassword;

    if (!passwordActual || !nuevaPassword) {
      return errorResponse(res, 'Contraseña actual y nueva contraseña son requeridas', 400);
    }

    const usuario = await User.findById(req.usuario._id).select('+password');

    const passwordValida = await usuario.compararPassword(passwordActual);

    if (!passwordValida) {
      return errorResponse(res, 'Contraseña actual incorrecta', 400);
    }

    usuario.password = nuevaPassword;
    await usuario.save();

    successResponse(res, 'Contraseña cambiada exitosamente');
  } catch (error) {
    next(error);
  }
};

// @desc    Reenviar email de verificación
// @route   POST /api/auth/reenviar-verificacion
// @access  Public
const reenviarVerificacion = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Buscar usuario
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(404).json(
        errorResponse(res, 'Usuario no encontrado', 400)
      );
    }

    // Verificar si ya está verificado
    if (usuario.estado === 'activo') {
      return res.status(400).json(
        errorResponse(res, 'La cuenta ya está verificada', 400)
      );
    }

    // Generar nuevo token de verificación
    const tokenVerificacion = generarTokenVerificacion(usuario._id, email);
    
    // Guardar token en el usuario
    usuario.tokenVerificacion = tokenVerificacion;
    await usuario.save();

    // Enviar email de verificación
    try {
      await enviarEmailBienvenida(email, usuario.nombre, tokenVerificacion);
    } catch (emailError) {
      logger.error('auth_verification_email_legacy_failed', { requestId: req.requestId, message: emailError.message });
      return res.status(500).json(
        errorResponse(res, 'Error enviando email de verificación', 400)
      );
    }

    successResponse(res, 'Email de verificación enviado exitosamente');

  } catch (error) {
    next(error);
  }
};

// @desc    Callback de Google OAuth
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res, next) => {
  try {
    const user = req.user;

    const token = generarTokenAcceso(user._id, user.rol);
    const refreshToken = generarTokenActualizacion(user._id);

    establecerTokenEnCookie(res, token);

    user.fechaUltimoLogin = new Date();
    await user.save();

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const code = crypto.randomBytes(32).toString('hex');
    await OAuthHandoff.create({
      code,
      accessToken: token,
      refreshToken,
      expiresAt: new Date(Date.now() + 3 * 60 * 1000)
    });

    res.redirect(`${frontendURL}/auth/callback?code=${encodeURIComponent(code)}`);

  } catch (error) {
    logger.error('auth_google_callback_failed', { requestId: req.requestId, message: error.message });
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/login?error=oauth_error`);
  }
};

// @desc    Callback de Facebook OAuth
// @route   GET /api/auth/facebook/callback
// @access  Public
const facebookCallback = async (req, res, next) => {
  try {
    const user = req.user;

    const token = generarTokenAcceso(user._id, user.rol);
    const refreshToken = generarTokenActualizacion(user._id);

    establecerTokenEnCookie(res, token);

    user.fechaUltimoLogin = new Date();
    await user.save();

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const code = crypto.randomBytes(32).toString('hex');
    await OAuthHandoff.create({
      code,
      accessToken: token,
      refreshToken,
      expiresAt: new Date(Date.now() + 3 * 60 * 1000)
    });

    res.redirect(`${frontendURL}/auth/callback?code=${encodeURIComponent(code)}`);

  } catch (error) {
    logger.error('auth_facebook_callback_failed', { requestId: req.requestId, message: error.message });
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/login?error=oauth_error`);
  }
};

// @desc    Failure callback para OAuth
// @route   GET /api/auth/failure
// @access  Public
const oauthFailure = (req, res) => {
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendURL}/login?error=oauth_cancelled`);
};

// @desc    Login con Firebase (Google/Facebook)
// @route   POST /api/auth/firebase-login
// @access  Public
const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken, provider, email, nombre, photoURL } = req.body;

    if (!idToken) {
      return errorResponse(res, 'Token de Firebase requerido', 400);
    }

    if (!provider || provider !== 'google') {
      return errorResponse(res, 'Inicio social no disponible con este proveedor. Usa Google.', 400);
    }

    let decodedToken;
    try {
      if (!auth) {
        return errorResponse(res, 'Autenticación con proveedor no disponible', 503);
      } else {
        decodedToken = await auth.verifyIdToken(idToken);
      }
    } catch (error) {
      logger.warn('auth_firebase_token_invalid', { requestId: req.requestId, message: error.message });
      return errorResponse(res, 'Token de Firebase inválido', 401);
    }

    const firebaseUid = decodedToken.uid;
    const firebaseEmail = decodedToken.email || email;

    let usuario = await User.findOne({
      $or: [{ email: firebaseEmail }, { proveedorId: firebaseUid, proveedor: provider }]
    });

    if (usuario) {
      if (!usuario.proveedorId) {
        usuario.proveedorId = firebaseUid;
        usuario.proveedor = provider;
      }
      if (photoURL && !usuario.avatar) {
        usuario.avatar = photoURL;
      }
      usuario.verificado = true;
      await usuario.save();
    } else {
      usuario = new User({
        nombre: nombre || decodedToken.name || 'Usuario',
        email: firebaseEmail,
        proveedor: provider,
        proveedorId: firebaseUid,
        avatar: photoURL || decodedToken.picture,
        verificado: true,
        rol: null
      });
      await usuario.save();
    }

    if (!usuario.rol) {
      const pendingToken = generarTokenSeleccionRol(usuario._id);
      return successResponse(
        res,
        'Usuario registrado, debe seleccionar rol',
        {
          requiereSeleccionRol: true,
          pendingToken,
          usuario: {
            _id: usuario._id,
            nombre: usuario.nombre,
            email: usuario.email,
            avatar: usuario.avatar,
            proveedor: usuario.proveedor
          }
        },
        200
      );
    }

    const token = generarTokenAcceso(usuario._id, usuario.rol);
    const refreshToken = generarTokenActualizacion(usuario._id);
    establecerTokenEnCookie(res, token);

    return successResponse(res, 'Autenticación exitosa', {
      token,
      refreshToken,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        avatar: usuario.avatar,
        verificado: usuario.verificado,
        proveedor: usuario.proveedor
      }
    }, 200);
  } catch (error) {
    logger.error('auth_firebase_login_failed', { requestId: req.requestId, message: error.message });
    return errorResponse(res, 'Error en la autenticación', 500);
  }
};

// @desc    Seleccionar rol después del registro OAuth
// @route   POST /api/auth/seleccionar-rol
// @access  Public (requiere pendingToken / Bearer de selección de rol)
const seleccionarRol = async (req, res, next) => {
  try {
    const {
      userId,
      rol,
      pendingToken,
      nombreEmpresa,
      descripcionEmpresa,
      categoriaEmpresa,
      sitioWeb,
      redesSociales,
      telefono,
      tipoDocumento,
      numeroDocumento
    } = req.body;

    const resolvePendingOwnerId = () => {
      let tok = null;
      const h = req.headers.authorization;
      if (h && h.startsWith('Bearer ')) tok = h.split(' ')[1];
      if (!tok && pendingToken) tok = pendingToken;
      if (!tok) return null;
      try {
        const d = verificarTokenSeleccionRol(tok);
        return String(d.id);
      } catch {
        return null;
      }
    };

    if (!userId || !rol) {
      return errorResponse(res, 'Usuario y rol son requeridos', 400);
    }

    const pendingSubject = resolvePendingOwnerId();
    if (!pendingSubject || pendingSubject !== String(userId)) {
      return errorResponse(
        res,
        'Sesión de selección de rol inválida o vencida. Vuelve a iniciar sesión con Google.',
        401
      );
    }

    const usuario = await User.findById(userId);

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    if (usuario.rol) {
      return errorResponse(res, 'El usuario ya tiene un rol asignado', 400);
    }

    usuario.rol = rol;

    if (rol === 'comerciante') {
      if (!nombreEmpresa || !descripcionEmpresa || !categoriaEmpresa || !telefono) {
        return errorResponse(
          res,
          'Nombre de empresa, descripción, categoría y teléfono son requeridos para comerciantes',
          400
        );
      }

      usuario.nombreEmpresa = nombreEmpresa;
      usuario.descripcionEmpresa = descripcionEmpresa;
      usuario.categoriaEmpresa = categoriaEmpresa;
      usuario.sitioWeb = sitioWeb;
      usuario.redesSociales = redesSociales;
      usuario.telefono = telefono;
      usuario.tipoDocumento = tipoDocumento;
      usuario.numeroDocumento = numeroDocumento;

      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      usuario.codigoVerificacion = codigo;
      usuario.codigoExpiracion = new Date(Date.now() + 30 * 60 * 1000);

      await usuario.save();

      await enviarEmailBienvenida(usuario.email, usuario.nombre, codigo);

      return successResponse(
        res,
        'Datos de comerciante guardados. Revisa tu email para el código de verificación',
        {
          requiereVerificacion: true,
          userId: usuario._id
        },
        200
      );
    }

    await usuario.save();

    const token = generarTokenAcceso(usuario._id, usuario.rol);
    const refreshToken = generarTokenActualizacion(usuario._id);
    establecerTokenEnCookie(res, token);

    return successResponse(res, 'Rol asignado exitosamente', {
      token,
      refreshToken,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        avatar: usuario.avatar,
        verificado: usuario.verificado
      }
    }, 200);
  } catch (error) {
    logger.error('auth_select_role_failed', { requestId: req.requestId, message: error.message });
    return errorResponse(res, 'Error al seleccionar rol', 500);
  }
};

const intercambiarCodigoOAuth = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return errorResponse(res, 'Código requerido', 400);
    }

    const handoff = await OAuthHandoff.findOneAndDelete({ code });
    if (!handoff || handoff.expiresAt < new Date()) {
      return errorResponse(res, 'Código inválido o expirado', 400);
    }

    let payload;
    try {
      payload = verificarToken(handoff.accessToken);
    } catch {
      return errorResponse(res, 'Código inválido o expirado', 400);
    }

    const u = await User.findById(payload.id).select('-password');
    if (!u) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    successResponse(res, 'Sesión lista', {
      token: handoff.accessToken,
      refreshToken: handoff.refreshToken,
      usuario: {
        _id: u._id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        avatar: u.avatar || u.fotoPerfilSocial,
        verificado: u.verificado
      }
    });
  } catch (error) {
    next(error);
  }
};

const refrescarSesion = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 'Refresh token requerido', 400);
    }

    let decoded;
    try {
      decoded = verificarRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        exito: false,
        mensaje: 'Refresh token inválido o expirado.',
        codigo: 'REFRESH_INVALID'
      });
    }

    if (decoded.tipo !== 'refresh') {
      return res.status(401).json({
        exito: false,
        mensaje: 'Token inválido',
        codigo: 'REFRESH_INVALID'
      });
    }

    const usuario = await User.findById(decoded.id).select('-password');
    if (!usuario || usuario.estado !== 'activo') {
      return res.status(401).json({
        exito: false,
        mensaje: 'Sesión no válida',
        codigo: 'REFRESH_INVALID'
      });
    }

    const token = generarTokenAcceso(usuario._id, usuario.rol);
    const newRefresh = generarTokenActualizacion(usuario._id);
    establecerTokenEnCookie(res, token);

    successResponse(res, 'Tokens actualizados', { token, refreshToken: newRefresh });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registrarUsuario,
  iniciarSesion,
  cerrarSesion,
  obtenerPerfilActual,
  verificarEmail,
  verificarEmailConCodigo,
  reenviarCodigoVerificacion,
  solicitarRecuperacionPassword,
  restablecerPassword,
  cambiarPassword,
  reenviarVerificacion,
  googleCallback,
  facebookCallback,
  oauthFailure,
  firebaseLogin,
  seleccionarRol,
  intercambiarCodigoOAuth,
  refrescarSesion
}; 
