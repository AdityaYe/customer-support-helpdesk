import express from 'express';
import { getAgentTickets, getAssignableAgents } from '../controllers/agentController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('agent', 'manager', 'admin'));
router.get('/tickets', getAgentTickets);
router.get('/agents', getAssignableAgents);

export default router;
