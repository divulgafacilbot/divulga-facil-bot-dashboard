import './env.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import templatesRoutes from './routes/templates.routes.js';
import templatesPublicRoutes from './routes/templates-public.routes.js';
import brandConfigRoutes from './routes/brand-config.routes.js';
import telegramRoutes from './routes/telegram.routes.js';
import artGenerationRoutes from './routes/art-generation.routes.js';
import layoutPreferencesRoutes from './routes/layout-preferences.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import adminRoutes from './routes/admin/index.js';
import userSupportRoutes from './routes/user/support.routes.js';
import userFinanceRoutes from './routes/user/finance.routes.js';
import userCampaignsRoutes from './routes/user/campaigns.routes.js';
import pinterestRoutes from './routes/pinterest.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import suggestionsRoutes from './routes/suggestions.routes.js';
import publicRoutes from './routes/public.routes.js';
import internalJobsRoutes from './routes/internal/jobs.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { CleanupService } from './services/jobs/cleanup.service.js';
import { schedulerService } from './services/jobs/scheduler.service.js';
import { artsBot } from './bot/arts-bot.js';
import { downloadBot, startDownloadBot } from './bot/download-bot.js';
import { pinterestBot } from './bot/pinterest-bot.js';
import { startSuggestionBot } from './bot/suggestion-bot.js';

export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, '..', 'uploads');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: true,
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

// MILESTONE_7 Routes (mount before any /api routers with auth middleware)
app.use('/api/admin', adminRoutes);
app.use('/api/user/support', userSupportRoutes);
app.use('/api/user/finance', userFinanceRoutes);
app.use('/api/user/campaigns', userCampaignsRoutes);

app.use('/api', artGenerationRoutes);  // Must be before routes with global auth middleware
app.use('/api', telegramRoutes);
app.use('/api', userRoutes);
app.use('/api', brandConfigRoutes);
app.use('/api', layoutPreferencesRoutes);
app.use('/api', metricsRoutes);
app.use('/api/pinterest', pinterestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/templates', templatesPublicRoutes);
app.use('/api/user-templates', templatesRoutes);
app.use('/internal/jobs', internalJobsRoutes);

// Public marketplace routes (MUST be last - has catch-all /:slug routes)
app.use(publicRoutes);

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

    // Start housekeeping scheduler (in-process)
    schedulerService.start();

    // Start Telegram bots in parallel
    try {
      await Promise.all([
        artsBot.start(),
        startDownloadBot(),
        pinterestBot.start(),
        startSuggestionBot(),
      ]);
      console.log('🤖 Telegram bots started successfully');
    } catch (error) {
      console.error('❌ Failed to start Telegram bots:', error);
      console.error('Make sure TELEGRAM_BOT_ARTS_TOKEN, TELEGRAM_BOT_DOWNLOAD_TOKEN, TELEGRAM_BOT_PINTEREST_TOKEN, and TELEGRAM_BOT_SUGESTION_TOKEN are set in .env file');
    }
  });
}
