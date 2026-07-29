import { Router } from 'express';
import { createExpense, getExpenses } from '../controllers/expense.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN'), createExpense);
router.get('/', requireAuth, requireRole('ADMIN'), getExpenses);

export default router;