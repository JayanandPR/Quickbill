import { Router } from 'express';
import { getSettings, updateSettings, uploadLogo } from '../controllers/settings.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';

const router = Router();

router.get('/', requireAuth, getSettings);
router.put('/', requireAuth, requireRole('ADMIN'), updateSettings);
router.post('/logo', requireAuth, requireRole('ADMIN'), uploadSingleImage.single('logo'), uploadLogo);

export default router;