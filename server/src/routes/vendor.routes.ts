import { Router } from 'express';
import {
  createVendor,
  getVendors,
  updateVendor,
  deleteVendor,
} from '../controllers/vendor.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Vendors are back-office only — Admin manages all of it
router.get('/', requireAuth, requireRole('ADMIN'), getVendors);
router.post('/', requireAuth, requireRole('ADMIN'), createVendor);
router.put('/:id', requireAuth, requireRole('ADMIN'), updateVendor);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteVendor);

export default router;