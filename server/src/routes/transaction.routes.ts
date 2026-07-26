import { Router } from 'express';
import {
  createSale,
  getTransactions,
  getTransactionById,
} from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { getTransactionInvoice } from '../controllers/transaction.controller';

const router = Router();

// Both Admin and Cashier can create sales and view transactions
router.post('/', requireAuth, createSale);
router.get('/', requireAuth, getTransactions);
router.get('/:id', requireAuth, getTransactionById);
router.get('/:id/invoice', requireAuth, getTransactionInvoice);

export default router;