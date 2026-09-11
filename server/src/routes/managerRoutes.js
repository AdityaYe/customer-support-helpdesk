import express from 'express';
import { getManagerAnalytics, getManagerDashboard } from '../controllers/managerController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('manager', 'admin'));
router.get('/dashboard', getManagerDashboard);
router.get('/analytics', getManagerAnalytics);

export default router;
