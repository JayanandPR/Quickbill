import { Router } from 'express';
import { getJournalEntries, getAccounts } from '../controllers/ledger.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/accounts', requireAuth, getAccounts);
router.get('/journal-entries', requireAuth, requireRole('ADMIN'), getJournalEntries);

export default router;