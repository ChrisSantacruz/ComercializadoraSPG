const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { validarRegistroUsuario, validarLoginUsuario } = require('../middlewares/validation');
const passport = require('passport');

// @route   POST /api/auth/refresh
// @desc    Rotate access token using refresh token
// @access  Public
router.post('/refresh', authController.refrescarSesion);

// @route   POST /api/auth/oauth/exchange
// @desc    Exchange one-time OAuth handoff code for tokens (no JWT in browser URL)
// @access  Public
router.post('/oauth/exchange', authController.intercambiarCodigoOAuth);

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validarRegistroUsuario, authController.registrarUsuario);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validarLoginUsuario, authController.iniciarSesion);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.obtenerPerfilActual);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', protect, authController.cambiarPassword);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', authController.solicitarRecuperacionPassword);

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.put('/reset-password/:token', authController.restablecerPassword);

// @route   POST /api/auth/verify-email
// @desc    Verify email with token (legacy)
// @access  Public
router.post('/verify-email', authController.verificarEmail);

// @route   POST /api/auth/verificar-codigo
// @desc    Verify email with code
// @access  Public
router.post('/verificar-codigo', authController.verificarEmailConCodigo);

// @route   POST /api/auth/reenviar-codigo
// @desc    Resend verification code
// @access  Public
router.post('/reenviar-codigo', authController.reenviarCodigoVerificacion);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email (legacy)
// @access  Public
router.post('/resend-verification', authController.reenviarVerificacion);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, authController.cerrarSesion);

// ===== RUTAS DE AUTENTICACIÓN SOCIAL =====

// Solo agregar rutas OAuth si están configuradas las credenciales
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // @route   GET /api/auth/google
  // @desc    Iniciar autenticación con Google
  // @access  Public
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // @route   GET /api/auth/google/callback
  // @desc    Callback de Google OAuth
  // @access  Public
  router.get('/google/callback',
    passport.authenticate('google', { 
      failureRedirect: '/api/auth/failure',
      session: false 
    }),
    authController.googleCallback
  );
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  // @route   GET /api/auth/facebook
  // @desc    Iniciar autenticación con Facebook
  // @access  Public
  router.get('/facebook',
    passport.authenticate('facebook', { scope: ['public_profile'] })
  );

  // @route   GET /api/auth/facebook/callback
  // @desc    Callback de Facebook OAuth
  // @access  Public
  router.get('/facebook/callback',
    passport.authenticate('facebook', { 
      failureRedirect: '/api/auth/failure',
      session: false 
    }),
    authController.facebookCallback
  );
}

// @route   GET /api/auth/failure
// @desc    Failure callback para OAuth
// @access  Public
router.get('/failure', authController.oauthFailure);

// @route   POST /api/auth/firebase-login
// @desc    Login con Firebase (Google/Facebook)
// @access  Public
router.post('/firebase-login', authController.firebaseLogin);

// @route   POST /api/auth/seleccionar-rol
// @desc    Seleccionar rol después de OAuth
// @access  Public
router.post('/seleccionar-rol', authController.seleccionarRol);

module.exports = router; 