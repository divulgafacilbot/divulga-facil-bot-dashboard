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

    // Check if Telegram bots should be disabled (for local development)
    if (process.env.DISABLE_TELEGRAM_BOTS === 'true') {
      console.log('⚠️ Telegram bots disabled (DISABLE_TELEGRAM_BOTS=true)');
    } else {
      // Start Telegram bots with retry logic for handling deploy conflicts
      // Telegram long-poll timeout is 30s, so we need longer delays
      await startTelegramBots();
    }
  });
}

async function startTelegramBots() {
  const startBotsWithRetry = async (maxRetries = 5, baseDelay = 10000) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Starting Telegram bots (attempt ${attempt}/${maxRetries})...`);

          // Try to drop pending updates (ignore errors - may timeout)
          try {
            await Promise.race([
              Promise.all([
                artsBot.api.deleteWebhook({ drop_pending_updates: true }),
                pinterestBot.api.deleteWebhook({ drop_pending_updates: true }),
              ]),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Webhook cleanup timeout')), 5000))
            ]);
            console.log('✅ Webhook cleanup successful');
          } catch (e) {
            console.warn('⚠️ Webhook cleanup skipped (timeout or error)');
          }

          // Wait for Telegram to release connections (longer on retries)
          const delay = baseDelay * attempt;
          console.log(`⏳ Waiting ${delay/1000}s for connections to clear...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Start bots (fire-and-forget since bot.start() blocks forever)
          console.log('🤖 Starting Arts Bot...');
          artsBot.start().catch(err => console.error('Arts Bot error:', err));

          console.log('🤖 Starting Download Bot...');
          startDownloadBot().catch(err => console.error('Download Bot error:', err));

          console.log('🤖 Starting Pinterest Bot...');
          pinterestBot.start().catch(err => console.error('Pinterest Bot error:', err));

          console.log('🤖 Starting Suggestion Bot...');
          startSuggestionBot().catch(err => console.error('Suggestion Bot error:', err));

          // Wait a bit to see if any bot throws immediately
          await new Promise(resolve => setTimeout(resolve, 3000));

          console.log('✅ All Telegram bots started successfully');
          return; // Success, exit retry loop
        } catch (error: any) {
          const isConflict = error?.error_code === 409 || error?.message?.includes('409');

          if (isConflict && attempt < maxRetries) {
            console.warn(`⚠️ Bot conflict detected (attempt ${attempt}/${maxRetries}), retrying...`);
            // Stop any partially started bots before retry
            try { artsBot.stop(); } catch {}
            try { pinterestBot.stop(); } catch {}
          } else {
            throw error;
          }
        }
      }
    };

  try {
    await startBotsWithRetry();
  } catch (error) {
    console.error('❌ Failed to start Telegram bots after all retries:', error);
    console.error('Make sure TELEGRAM_BOT_ARTS_TOKEN, TELEGRAM_BOT_DOWNLOAD_TOKEN, TELEGRAM_BOT_PINTEREST_TOKEN, and TELEGRAM_BOT_SUGESTION_TOKEN are set in .env file');
  }
}
