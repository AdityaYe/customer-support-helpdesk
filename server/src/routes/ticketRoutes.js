import express from 'express';
import {
  addMessage,
  assignTicket,
  createTicket,
  createTicketRules,
  getMyTickets,
  getSatisfaction,
  getTicket,
  getTicketActivity,
  messageRules,
  satisfactionRules,
  submitSatisfaction,
  updateTags,
  updatePriority,
  updateStatus
} from '../controllers/ticketController.js';
import {
  downloadAttachment,
  listAttachments,
  uploadAttachments
} from '../controllers/attachmentController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

router.post('/', authorize('customer'), createTicketRules, validateRequest, createTicket);
router.get('/my', authorize('customer'), getMyTickets);
router.get('/:id', getTicket);
router.get('/:id/activity', getTicketActivity);
router.get('/:id/satisfaction', getSatisfaction);
router.post('/:id/satisfaction', authorize('customer'), satisfactionRules, validateRequest, submitSatisfaction);
router.get('/:id/attachments', listAttachments);
router.post('/:id/attachments', upload.array('attachments', 3), uploadAttachments);
router.get('/:id/attachments/:attachmentId', downloadAttachment);
router.post('/:id/messages', messageRules, validateRequest, addMessage);
router.patch('/:id/status', authorize('agent', 'manager', 'admin'), updateStatus);
router.patch('/:id/priority', authorize('agent', 'manager', 'admin'), updatePriority);
router.patch('/:id/tags', authorize('agent', 'manager', 'admin'), updateTags);
router.post('/:id/assign', authorize('agent', 'manager', 'admin'), assignTicket);

export default router;
