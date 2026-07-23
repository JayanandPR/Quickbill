import { Router } from 'express';
import {
  createSale,
  getTransactions,
  getTransactionById,
} from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Both Admin and Cashier can create sales and view transactions
router.post('/', requireAuth, createSale);
router.get('/', requireAuth, getTransactions);
router.get('/:id', requireAuth, getTransactionById);

export default router;