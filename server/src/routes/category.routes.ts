import { Router } from 'express';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Both roles can view categories (needed for billing screen)
router.get('/', requireAuth, getCategories);

// Only Admin can manage categories
router.post('/', requireAuth, requireRole('ADMIN'), createCategory);
router.put('/:id', requireAuth, requireRole('ADMIN'), updateCategory);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteCategory);

export default router;