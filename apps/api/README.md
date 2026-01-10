# Divulga Fácil Bot - API

Backend API for the Divulga Fácil Bot dashboard and Telegram bots.

## Overview

Express.js API with TypeScript providing:
- User authentication and authorization
- Telegram bot integrations (Arts, Download, Pinterest, Suggestions)
- Marketplace product management
- AI-powered product suggestions
- Pinterest board automation
- Time infrastructure and TTL system
- Scheduled jobs and housekeeping

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Telegram**: Grammy
- **Scheduling**: node-cron
- **Testing**: Vitest
- **Timezone**: Luxon (America/Sao_Paulo - BRT)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Railway account (for cron jobs)

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
INTERNAL_JOBS_SECRET=your-job-secret-here

# Telegram Bot Tokens
TELEGRAM_BOT_ARTS_TOKEN=...
TELEGRAM_BOT_DOWNLOAD_TOKEN=...
TELEGRAM_BOT_PINTEREST_TOKEN=...
TELEGRAM_BOT_SUGESTION_TOKEN=...

# Optional: External APIs for scraping
SERPAPI_API_KEY=...
PERPLEXITY_API_KEY=...
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Production

```bash
# Build
npm run build

# Start
npm start
```

## Project Structure

```
apps/api/
├── src/
│   ├── bot/                    # Telegram bots
│   │   ├── arts-bot.ts
│   │   ├── pinterest-bot.ts
│   │   ├── download-bot.ts
│   │   └── shared/             # Shared bot utilities
│   ├── controllers/            # HTTP request handlers
│   │   ├── internal/           # Internal job endpoints
│   │   └── ...
│   ├── routes/                 # Express routes
│   ├── services/               # Business logic
│   │   ├── jobs/               # Job system (locks, housekeeping, scheduler)
│   │   ├── suggestions/        # AI suggestions
│   │   ├── marketplace/        # Product management
│   │   ├── pinterest/          # Pinterest automation
│   │   └── ...
│   ├── middleware/             # Express middleware
│   ├── utils/                  # Utilities
│   │   ├── time.ts             # Time infrastructure (BRT, TTL)
│   │   └── ...
│   ├── constants/              # App constants
│   │   ├── time.constants.ts   # Time configuration
│   │   └── ...
│   ├── db/                     # Database
│   │   └── prisma.ts
│   ├── scraping/               # Web scraping
│   └── server.ts               # Express app entry
├── prisma/
│   └── schema.prisma           # Database schema
├── docs/                       # Documentation
│   └── TIME_INFRASTRUCTURE.md  # Time system docs
├── railway.toml                # Railway configuration
└── package.json
```

## Key Features

### 1. Time Infrastructure

Single timezone source of truth (BRT) with logical day cutoff and TTL system.

**Key Utilities:**
```typescript
import { nowBrt, getDayKey, isExpired, computeExpiresAt } from './utils/time';

const now = nowBrt();                  // Current time in BRT
const dayKey = getDayKey(now);         // Logical day (06:00 cutoff)
const expiresAt = computeExpiresAt(3600); // 1 hour from now
if (isExpired(expiresAt)) { ... }      // Check expiration
```

See [TIME_INFRASTRUCTURE.md](./docs/TIME_INFRASTRUCTURE.md) for full documentation.

### 2. Job System

Distributed job scheduling with locks and housekeeping.

**Components:**
- **JobLockService**: Prevents concurrent job execution
- **HousekeepingService**: Daily cleanup of expired data
- **SchedulerService**: In-process cron scheduler (fallback)

**Housekeeping Schedule:**
- Runs daily at 06:15 BRT
- Triggered by Railway cron (primary) or in-process scheduler (fallback)
- Cleans: expired events, caches, dedupe keys, tokens

### 3. Telegram Bots

Four Telegram bots for different workflows:

**Arts Bot** (`TELEGRAM_BOT_ARTS_TOKEN`)
- Generates promotional art from product URLs
- Uses AI for image generation
- Saves to user's gallery

**Download Bot** (`TELEGRAM_BOT_DOWNLOAD_TOKEN`)
- Downloads media from various platforms
- Supports images, videos, audio
- Provides download links

**Pinterest Bot** (`TELEGRAM_BOT_PINTEREST_TOKEN`)
- Scrapes products from marketplace URLs
- Saves to user's marketplace catalog
- Supports Shopee, Mercado Livre, Amazon, AliExpress

**Suggestions Bot** (`TELEGRAM_BOT_SUGESTION_TOKEN`)
- AI-powered product suggestions
- Analyzes user's catalog
- Recommends trending products

### 4. API Endpoints

**Public:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /health` - Health check

**Protected (JWT):**
- `/api/user/*` - User management
- `/api/marketplace/*` - Marketplace products
- `/api/suggestions/*` - AI suggestions
- `/api/pinterest/*` - Pinterest boards
- `/api/templates/*` - Art templates
- `/api/analytics/*` - Analytics

**Internal (Job Auth):**
- `POST /internal/jobs/housekeeping` - Trigger housekeeping
- `GET /internal/jobs/lock-status/:jobName` - Check lock status
- `DELETE /internal/jobs/lock/:jobName` - Force release lock

### 5. Database Schema

Key tables:
- `users` - User accounts
- `marketplace_products` - Product catalog
- `suggestion_history` - AI suggestions
- `pinterest_boards` - Pinterest automation
- `public_events` - Telemetry (TTL: 30d)
- `job_locks` - Distributed locks

See `prisma/schema.prisma` for full schema.

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- time.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Railway (Recommended)

1. **Create Railway Project**
   - Add PostgreSQL service
   - Add API service (this repo)

2. **Configure Environment Variables**
   - Set all required env vars from `.env`
   - `INTERNAL_JOBS_SECRET` (critical for cron)
   - `ENABLE_INPROCESS_SCHEDULER=false` (Railway cron handles it)

3. **Deploy**
   - Railway reads `railway.toml` for cron configuration
   - Housekeeping job runs daily at 06:15 BRT

### Alternative: Render, Heroku, etc.

- Set up PostgreSQL database
- Configure environment variables
- Enable in-process scheduler: `ENABLE_INPROCESS_SCHEDULER=true`
- Set up external cron (optional): call `/internal/jobs/housekeeping`

## Monitoring

### Health Check

```bash
curl https://your-api.railway.app/health
```

### Job Status

```bash
curl -H "x-internal-job-secret: YOUR_SECRET" \
  https://your-api.railway.app/internal/jobs/lock-status/housekeeping
```

### Logs

```bash
# Railway
railway logs

# Local
npm run dev
```

## Troubleshooting

### Issue: Bots not starting

**Check:**
- Telegram bot tokens set in `.env`?
- Tokens valid? (Test with `@BotFather`)
- Network connectivity?

**Logs:**
```
❌ Failed to start Telegram bots: ...
Make sure TELEGRAM_BOT_*_TOKEN are set in .env file
```

### Issue: Jobs not running

**Check:**
- `INTERNAL_JOBS_SECRET` set?
- Railway cron configured? (`railway.toml`)
- Job locked? (Check `/internal/jobs/lock-status/housekeeping`)

**Fix:**
```bash
# Force release lock
curl -X DELETE \
  -H "x-internal-job-secret: YOUR_SECRET" \
  https://your-api.railway.app/internal/jobs/lock/housekeeping
```

### Issue: Database connection failed

**Check:**
- `DATABASE_URL` correct?
- Database accessible?
- Prisma client generated? (`npx prisma generate`)

## Documentation

- [TIME_INFRASTRUCTURE.md](./docs/TIME_INFRASTRUCTURE.md) - Time system and TTL
- [Prisma Schema](./prisma/schema.prisma) - Database schema
- [Railway Config](./railway.toml) - Cron jobs

## Contributing

1. Create feature branch
2. Make changes
3. Write tests
4. Run `npm test`
5. Submit PR

## License

Proprietary - All rights reserved
