const Category = require('../models/Category');
const logger = require('../utils/logger');

const BASE_CATEGORIES = [
  ['Hogar y Decoración', 'Productos para decoración, organización y bienestar del hogar', 'home', '#2563EB'],
  ['Cocina y Comedor', 'Utensilios, accesorios y soluciones para cocina y mesa', 'shopping-bag', '#F97316'],
  ['Infantil y Bebés', 'Productos para bebés, niños y cuidado infantil', 'sparkles', '#EC4899'],
  ['Aseo y Cuidado Personal', 'Artículos de higiene, belleza y cuidado personal', 'heart', '#14B8A6'],
  ['Manufactura y Herramientas', 'Herramientas, insumos y productos para trabajo manual', 'wrench', '#64748B'],
  ['Tecnología y Electrónicos', 'Dispositivos, accesorios tecnológicos y electrónicos', 'computer', '#6366F1'],
  ['Ropa y Accesorios', 'Moda, prendas, calzado y accesorios', 'tag', '#A855F7'],
  ['Deportes y Recreación', 'Artículos deportivos, recreación y vida activa', 'trophy', '#22C55E'],
  ['Mascotas', 'Productos para mascotas, cuidado y bienestar animal', 'paw', '#F59E0B'],
  ['Alimentación y Bebidas', 'Alimentos, bebidas y productos de consumo', 'cake', '#EF4444'],
  ['Limpieza del Hogar', 'Productos de limpieza, desinfección y mantenimiento', 'sparkles', '#06B6D4'],
  ['Jardinería y Plantas', 'Plantas, jardinería, herramientas e insumos verdes', 'leaf', '#16A34A'],
  ['Oficina y Papelería', 'Papelería, oficina, estudio y organización documental', 'document', '#0EA5E9'],
  ['Automóviles y Motocicletas', 'Accesorios, cuidado y productos para vehículos', 'truck', '#475569'],
  ['Salud y Bienestar', 'Productos orientados al bienestar, salud y autocuidado', 'heart', '#10B981'],
];

async function upsertBaseCategories() {
  let created = 0;
  let updated = 0;

  for (let i = 0; i < BASE_CATEGORIES.length; i += 1) {
    const [nombre, descripcion, icono, color] = BASE_CATEGORIES[i];
    let doc = await Category.findOne({ nombre });

    if (!doc) {
      doc = new Category({
        nombre,
        descripcion,
        icono,
        color,
        orden: i + 1,
        estado: 'activa',
        padre: null,
        mostrarEnMenu: true,
        destacada: i < 6,
      });
      created += 1;
    } else {
      doc.descripcion = doc.descripcion || descripcion;
      doc.icono = doc.icono || icono;
      doc.color = doc.color || color;
      doc.orden = doc.orden || i + 1;
      doc.estado = 'activa';
      doc.padre = doc.padre || null;
      doc.mostrarEnMenu = true;
      if (doc.destacada == null) doc.destacada = i < 6;
      updated += 1;
    }

    await doc.save();
  }

  const active = await Category.countDocuments({ estado: 'activa' });
  return { created, updated, active };
}

async function seedActiveCategories() {
  return upsertBaseCategories();
}

async function ensureActiveCategories({ reason = 'startup' } = {}) {
  if (process.env.CATEGORY_BOOTSTRAP_DISABLED === 'true') {
    return { skipped: true, reason: 'disabled' };
  }

  const active = await Category.countDocuments({ estado: 'activa' });
  if (active > 0) {
    return { skipped: true, active };
  }

  const result = await upsertBaseCategories();
  logger.warn('active_categories_bootstrapped', { reason, ...result });
  return { skipped: false, ...result };
}

module.exports = {
  BASE_CATEGORIES,
  seedActiveCategories,
  ensureActiveCategories,
};
