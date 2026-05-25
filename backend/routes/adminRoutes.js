const express = require('express');
const {
  getDashboard,
  listProducts,
  moderateProduct,
  deleteProduct,
  listUsers,
  updateUserStatus,
  bootstrapSuperAdminForm,
  bootstrapSuperAdmin,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/bootstrap-superadmin', bootstrapSuperAdminForm);
router.post('/bootstrap-superadmin', bootstrapSuperAdmin);

router.use(protect, authorize('admin', 'superadmin'));

router.get('/dashboard', getDashboard);
router.get('/products', listProducts);
router.patch('/products/:id/:action(approve|reject|suspend)', moderateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
