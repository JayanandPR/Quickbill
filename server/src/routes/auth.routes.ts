import { Router } from 'express';
import { register, login, me, updateProfile, changePassword } from '../controllers/auth.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', optionalAuth, register);
router.post('/login', login);
router.get('/me', requireAuth, me); // protected — proves the middleware works
router.put('/me', requireAuth, updateProfile);
router.put('/me/password', requireAuth, changePassword);

export default router;