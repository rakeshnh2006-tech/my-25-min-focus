import { Router } from 'express';
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAnalyticsSubjects,
  getAnalyticsHeatmap,
} from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/summary', getAnalyticsSummary);
router.get('/trends', getAnalyticsTrends);
router.get('/subjects', getAnalyticsSubjects);
router.get('/heatmap', getAnalyticsHeatmap);

export default router;
