import './env.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import templatesRoutes from './routes/templates.routes.js';
import brandConfigRoutes from './routes/brand-config.routes.js';
import telegramRoutes from './routes/telegram.routes.js';
import artGenerationRoutes from './routes/art-generation.routes.js';
import layoutPreferencesRoutes from './routes/layout-preferences.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { CleanupService } from './services/jobs/cleanup.service.js';
import { artsBot } from './bot/arts-bot.js';

export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, '..', 'uploads');

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (() => {
      const allowed = (process.env.APP_BASE_URLS || process.env.APP_BASE_URL || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (allowed.length > 0) {
        return allowed;
      }

      return 'http://localhost:3000';
    })(),
    credentials: true,
  })
);
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', artGenerationRoutes);  // Must be before routes with global auth middleware
app.use('/api', telegramRoutes);
app.use('/api', userRoutes);
app.use('/api', brandConfigRoutes);
app.use('/api', layoutPreferencesRoutes);
app.use('/api', metricsRoutes);
app.use('/api/templates', templatesRoutes);

// Error handling
app.use(errorMiddleware);

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, async () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);

    // Start cleanup cron jobs
    CleanupService.start();

    // Start Telegram bot
    try {
      await artsBot.start();
      console.log('🤖 Telegram Arts Bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Telegram bot:', error);
      console.error('Make sure TELEGRAM_BOT_ARTS_TOKEN is set in .env file');
    }
  });
}
