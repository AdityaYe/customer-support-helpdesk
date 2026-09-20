import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import './config/env.js';
import adminRoutes from './routes/adminRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import helpCenterRoutes from './routes/helpCenterRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import savedReplyRoutes from './routes/savedReplyRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import { clientUrl } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: clientUrl(),
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Helpdesk API is running' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', helpCenterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/saved-replies', savedReplyRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
