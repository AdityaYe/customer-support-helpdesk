import express from 'express';
import { login, loginRules, logout, me, register, registerRules } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/register', registerRules, validateRequest, register);
router.post('/login', loginRules, validateRequest, login);
router.post('/logout', logout);
router.get('/me', protect, me);

export default router;
