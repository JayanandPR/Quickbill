import { Router } from 'express';
import {
  createSale,
  getTransactions,
  getTransactionById,
  getTransactionInvoice,
  getTransactionsExport
} from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';


const router = Router();

// Both Admin and Cashier can create sales and view transactions
router.get('/export', requireAuth, getTransactionsExport);
router.post('/', requireAuth, createSale);
router.get('/', requireAuth, getTransactions);
router.get('/:id', requireAuth, getTransactionById);
router.get('/:id/invoice', requireAuth, getTransactionInvoice);

export default router;