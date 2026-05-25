const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { successResponse, errorResponse, paginateData } = require('../utils/helpers');
const logger = require('../utils/logger');

const productModerationState = {
  approve: { estado: 'approved', mensaje: 'Producto aprobado' },
  reject: { estado: 'rejected', mensaje: 'Producto rechazado' },
  suspend: { estado: 'suspended', mensaje: 'Producto suspendido' },
};

async function getDashboard(req, res) {
  try {
    const [
      totalUsers,
      totalMerchants,
      totalProducts,
      pendingProducts,
      rejectedProducts,
      totalOrders,
      recentProducts,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ rol: { $in: ['merchant', 'comerciante'] } }),
      Product.countDocuments({}),
      Product.countDocuments({ estado: { $in: ['pending', 'pendiente'] } }),
      Product.countDocuments({ estado: { $in: ['rejected', 'rechazado'] } }),
      Order.countDocuments({}),
      Product.find({})
        .populate('comerciante', 'nombre email nombreEmpresa rol')
        .sort({ fechaCreacion: -1 })
        .limit(6)
        .lean(),
      User.find({})
        .select('nombre email rol estado fechaCreacion')
        .sort({ fechaCreacion: -1 })
        .limit(6)
        .lean(),
    ]);

    successResponse(res, 'Dashboard admin obtenido', {
      metrics: {
        totalUsers,
        totalMerchants,
        totalProducts,
        pendingProducts,
        rejectedProducts,
        totalOrders,
      },
      recentActivity: {
        products: recentProducts,
        users: recentUsers,
      },
    });
  } catch (error) {
    logger.error('admin_dashboard_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
}

async function listProducts(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const { estado, q } = req.query;
    const filtros = {};

    if (estado) filtros.estado = estado;
    if (q) {
      filtros.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { descripcion: { $regex: q, $options: 'i' } },
      ];
    }

    const [productos, total] = await Promise.all([
      Product.find(filtros)
        .populate('comerciante', 'nombre email nombreEmpresa rol estado')
        .populate('categoria', 'nombre slug')
        .sort({ fechaCreacion: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Product.countDocuments(filtros),
    ]);

    successResponse(res, 'Productos admin obtenidos', {
      datos: productos,
      paginacion: paginateData(total, page, limit),
    });
  } catch (error) {
    logger.error('admin_products_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
}

async function moderateProduct(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.params;
    const { reason } = req.body || {};
    const target = productModerationState[action];

    if (!target) {
      return errorResponse(res, 'Acción de moderación inválida', 400);
    }

    if (action === 'reject' && !String(reason || '').trim()) {
      return errorResponse(res, 'La razón de rechazo es obligatoria', 400);
    }

    const producto = await Product.findById(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    producto.estado = target.estado;
    producto.moderacion = {
      estado: target.estado,
      razonRechazo: action === 'reject' ? String(reason).trim() : undefined,
      moderadoPor: req.usuario._id,
      fechaModeracion: new Date(),
    };
    if (action === 'approve') {
      producto.fechaAprobacion = new Date();
      producto.fechaPublicacion = producto.fechaPublicacion || new Date();
    }

    await producto.save();

    logger.info('admin_product_moderated', {
      requestId: req.requestId,
      productId: producto._id,
      action,
      adminId: req.usuario._id,
    });

    successResponse(res, target.mensaje, producto.toObject({ virtuals: true }));
  } catch (error) {
    logger.error('admin_product_moderation_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
}

async function deleteProduct(req, res) {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return errorResponse(res, 'Producto no encontrado', 404);
    logger.info('admin_product_deleted', {
      requestId: req.requestId,
      productId: req.params.id,
      adminId: req.usuario._id,
    });
    successResponse(res, 'Producto eliminado');
  } catch (error) {
    logger.error('admin_product_delete_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
}

async function listUsers(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const { rol, estado, q } = req.query;
    const filtros = {};
    if (rol) filtros.rol = rol;
    if (estado) filtros.estado = estado;
    if (q) {
      filtros.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { nombreEmpresa: { $regex: q, $options: 'i' } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      User.find(filtros)
        .select('-password -tokenVerificacion -tokenRecuperacion -codigoVerificacion -codigo2FA -tokenRecordatorio')
        .sort({ fechaCreacion: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      User.countDocuments(filtros),
    ]);

    successResponse(res, 'Usuarios admin obtenidos', {
      datos: usuarios,
      paginacion: paginateData(total, page, limit),
    });
  } catch (error) {
    logger.error('admin_users_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
}

async function updateUserStatus(req, res) {
  try {
    const { estado } = req.body || {};
    if (!['activo', 'inactivo', 'bloqueado'].includes(estado)) {
      return errorResponse(res, 'Estado de usuario inválido', 400);
    }
    const usuario = await User.findByIdAndUpdate(
      req.params.id,
      { estado, fechaActualizacion: new Date() },
      { new: true, runValidators: true },
    ).select('-password');
    if (!usuario) return errorResponse(res, 'Usuario no encontrado', 404);
    logger.info('admin_user_status_updated', {
      requestId: req.requestId,
      userId: req.params.id,
      estado,
      adminId: req.usuario._id,
    });
    successResponse(res, 'Estado de usuario actualizado', usuario);
  } catch (error) {
    logger.error('admin_user_status_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error interno del servidor', 500);
  }
}

function bootstrapSuperAdminForm(req, res) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && process.env.ENABLE_ADMIN_BOOTSTRAP !== 'true') {
    return res.status(404).send('Bootstrap admin deshabilitado');
  }

  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Crear superadmin</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #f6f7f9; color: #111827; }
    main { width: min(92vw, 440px); background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; box-shadow: 0 20px 60px rgba(15, 23, 42, .08); }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 22px; color: #4b5563; line-height: 1.5; }
    label { display: block; margin: 14px 0 6px; font-weight: 700; font-size: 13px; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 10px; padding: 12px 14px; font-size: 15px; }
    button { width: 100%; margin-top: 20px; border: 0; border-radius: 10px; padding: 13px 16px; background: #111827; color: white; font-weight: 700; cursor: pointer; }
    small { display: block; margin-top: 16px; color: #6b7280; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>Crear superadmin</h1>
    <p>Usa esta pantalla solo durante la ventana de bootstrap. Al terminar, desactiva <strong>ENABLE_ADMIN_BOOTSTRAP</strong>.</p>
    <form method="post" action="/api/admin/bootstrap-superadmin" autocomplete="off">
      <label for="secret">Admin bootstrap secret</label>
      <input id="secret" name="secret" type="password" required />

      <label for="nombre">Nombre</label>
      <input id="nombre" name="nombre" type="text" required />

      <label for="email">Email admin</label>
      <input id="email" name="email" type="email" required />

      <label for="password">Password temporal</label>
      <input id="password" name="password" type="password" minlength="8" required />

      <button type="submit">Crear superadmin</button>
    </form>
    <small>Si la respuesta muestra <strong>Superadmin listo</strong>, entra luego en https://andinoexpress.com/login con ese email y password.</small>
  </main>
</body>
</html>`);
}

async function bootstrapSuperAdmin(req, res) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && process.env.ENABLE_ADMIN_BOOTSTRAP !== 'true') {
      return errorResponse(res, 'Bootstrap admin deshabilitado', 404);
    }

    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    const providedSecret = req.get('X-Admin-Bootstrap-Secret') || req.body?.secret;
    if (!bootstrapSecret || providedSecret !== bootstrapSecret) {
      return errorResponse(res, 'Bootstrap no autorizado', 401);
    }

    const adminData = req.body?.adminData || req.body || {};
    const { nombre, email, password } = adminData;
    if (!nombre || !email || !password) {
      return errorResponse(res, 'nombre, email y password son obligatorios', 400);
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let admin = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!admin) {
      admin = new User({ email: normalizedEmail, nombre, proveedor: 'local' });
    }

    admin.nombre = nombre;
    admin.password = password;
    admin.rol = 'superadmin';
    admin.estado = 'activo';
    admin.verificado = true;
    await admin.save();

    logger.warn('admin_bootstrap_completed', { requestId: req.requestId, adminId: admin._id });
    successResponse(res, 'Superadmin listo', {
      admin: {
        id: admin._id,
        nombre: admin.nombre,
        email: admin.email,
        rol: admin.rol,
      },
    }, 201);
  } catch (error) {
    logger.error('admin_bootstrap_failed', { requestId: req.requestId, message: error.message });
    errorResponse(res, 'Error creando superadmin', 500);
  }
}

module.exports = {
  getDashboard,
  listProducts,
  moderateProduct,
  deleteProduct,
  listUsers,
  updateUserStatus,
  bootstrapSuperAdminForm,
  bootstrapSuperAdmin,
};
