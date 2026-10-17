import { Router } from 'express';
import {
  getActiveSession,
  createSession,
  updateSession,
  completeSession,
  abandonSession,
  getSessions,
} from '../controllers/timerController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createSessionSchema,
  updateSessionActionSchema,
  completeSessionSchema,
  abandonSessionSchema,
  sessionQuerySchema,
} from '../validation/schemas';

const router = Router();

router.use(requireAuth);

router.get('/active', getActiveSession);
router.post('/', validateBody(createSessionSchema), createSession);
router.patch('/:id', validateBody(updateSessionActionSchema), updateSession);
router.post('/:id/complete', validateBody(completeSessionSchema), completeSession);
router.post('/:id/abandon', validateBody(abandonSessionSchema), abandonSession);
router.get('/', validateQuery(sessionQuerySchema), getSessions);

export default router;
