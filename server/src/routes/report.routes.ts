import { Router } from 'express';
import {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getSalesReport,
  getPendingDues,
  getNotifications
} from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All financial reports are Admin-only
router.get('/trial-balance', requireAuth, requireRole('ADMIN'), getTrialBalance);
router.get('/profit-and-loss', requireAuth, requireRole('ADMIN'), getProfitAndLoss);
router.get('/balance-sheet', requireAuth, requireRole('ADMIN'), getBalanceSheet);
router.get('/sales', requireAuth, requireRole('ADMIN'), getSalesReport);
router.get('/pending-dues', requireAuth, requireRole('ADMIN'), getPendingDues);
router.get('/notifications', requireAuth, requireRole('ADMIN'), getNotifications);

export default router;