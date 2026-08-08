import { Router } from 'express';
import { createVendorBill, getVendorBills, getVendorBillsExport } from '../controllers/vendorBill.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { getVendorBillInvoice } from '../controllers/vendorBill.controller';

const router = Router();

router.get('/export', requireAuth, requireRole('ADMIN'), getVendorBillsExport);
router.post('/', requireAuth, requireRole('ADMIN'), createVendorBill);
router.get('/', requireAuth, requireRole('ADMIN'), getVendorBills);
router.get('/:id/invoice', requireAuth, requireRole('ADMIN'), getVendorBillInvoice);

export default router;