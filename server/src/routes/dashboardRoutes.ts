import { Router } from 'express';
import { getDashboardSummary, getWeeklyStats } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/summary', getDashboardSummary);
router.get('/weekly', getWeeklyStats);

export default router;
