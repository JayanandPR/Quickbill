import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Both roles can view/search customers (needed at the billing screen)
router.get('/', requireAuth, getCustomers);
router.post('/', requireAuth, createCustomer);

// Only Admin edits/deletes customer records
router.put('/:id', requireAuth, requireRole('ADMIN'), updateCustomer);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteCustomer);

export default router;