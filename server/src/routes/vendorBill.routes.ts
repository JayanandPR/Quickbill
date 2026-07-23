import { Router } from 'express';
import { createVendorBill, getVendorBills } from '../controllers/vendorBill.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN'), createVendorBill);
router.get('/', requireAuth, requireRole('ADMIN'), getVendorBills);

export default router;