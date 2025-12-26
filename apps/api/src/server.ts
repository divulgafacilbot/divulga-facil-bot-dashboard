import './env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { CleanupService } from './services/jobs/cleanup.service.js';

export const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.APP_BASE_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/', userRoutes);

// Error handling
app.use(errorMiddleware);

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);

    // Start cleanup cron jobs
    CleanupService.start();
  });
}
