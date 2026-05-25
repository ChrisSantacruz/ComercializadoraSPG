/**
 * Restaura las categorías base del catálogo con estado "activa".
 * Uso: npm run seed:categories  (desde backend/, con .env y MongoDB disponibles)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { seedActiveCategories } = require('../services/categorySeedService');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/comercializadora_spg';
  await mongoose.connect(uri);
  const result = await seedActiveCategories();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
