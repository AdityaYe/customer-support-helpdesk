import express from 'express';
import {
  createResource,
  deleteResource,
  getAdminAnalytics,
  getAdminSummary,
  listResources,
  updateResource
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/summary', getAdminSummary);
router.get('/analytics', getAdminAnalytics);
router.get('/:resource', listResources);
router.post('/:resource', createResource);
router.patch('/:resource/:id', updateResource);
router.delete('/:resource/:id', deleteResource);

export default router;
