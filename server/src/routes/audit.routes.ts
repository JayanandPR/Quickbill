import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.get('/', requireAuth, requireRole('ADMIN'), getAuditLogs);
export default router;