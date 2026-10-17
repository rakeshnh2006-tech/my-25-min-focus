import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateSettingsSchema } from '../validation/schemas';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.patch('/', validateBody(updateSettingsSchema), updateSettings);

export default router;
