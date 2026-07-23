import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', optionalAuth, register);
router.post('/login', login);
router.get('/me', requireAuth, me); // protected — proves the middleware works

export default router;