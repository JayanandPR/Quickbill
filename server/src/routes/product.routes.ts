import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
} from '../controllers/product.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Both roles can view products (Cashier needs this for billing screen)
router.get('/', requireAuth, getProducts);
router.get('/low-stock', requireAuth, getLowStockProducts); // must come before /:id
router.get('/:id', requireAuth, getProductById);

// Only Admin can manage the catalog
router.post('/', requireAuth, requireRole('ADMIN'), createProduct);
router.put('/:id', requireAuth, requireRole('ADMIN'), updateProduct);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteProduct);

export default router;