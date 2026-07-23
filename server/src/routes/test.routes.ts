import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Any logged-in user (Admin or Cashier) can hit this
router.get('/any-user', requireAuth, (req, res) => {
  res.json({ message: `Hello, you are logged in as ${req.user?.role}` });
});

// Only Admins can hit this — Cashiers get a 403
router.get('/admin-only', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome, Admin. This route is restricted.' });
});

export default router;