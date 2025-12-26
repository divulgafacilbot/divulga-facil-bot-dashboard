# Posting Bot SaaS

Multi-bot SaaS platform for automated social media content generation and social media downloads.

## Overview

Posting Bot is a subscription-based service that provides two specialized Telegram bots:

- **Bot de Artes**: Scrapes marketplace product data (Shopee, Mercado Livre, Amazon, Magalu) and generates promotional images in multiple formats (card, story, WhatsApp status)
- **Bot de Download**: Downloads media from social platforms (Instagram, TikTok, Pinterest)

## Tech Stack

### Frontend (Web Dashboard)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

### Backend (API)
- **Runtime**: Node.js 20+
- **Framework**: Express
- **Language**: TypeScript (ESM modules)
- **Database**: PostgreSQL (Railway/Supabase)
- **Authentication**: JWT + bcrypt
- **Bots**: grammY (Telegram Bot Framework)
- **Web Scraping**: axios + cheerio + Playwright (fallback)
- **Image Rendering**: Playwright
- **Payments**: Kiwify Webhooks
- **Deployment**: Railway

### Shared
- **Monorepo**: npm workspaces
- **Types**: Shared TypeScript types and constants
- **Validation**: Zod schemas

## Project Structure

```
implementation/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   └── lib/                # Utilities
│   │
│   └── api/                    # Node.js backend
│       ├── src/
│       │   ├── config/         # Configuration (database, etc)
│       │   ├── routes/         # Express routes
│       │   ├── controllers/    # Route handlers
│       │   ├── services/       # Business logic
│       │   ├── db/             # Database migrations
│       │   └── utils/          # Utilities
│       └── server.ts           # Entry point
│
└── packages/
    └── shared/                 # Shared code
        ├── types/              # TypeScript types
        ├── constants/          # Constants
        └── utils/              # Utilities
```

## Database Schema

### Core Tables
- `users` - User accounts with authentication
- `password_reset_tokens` - Password recovery tokens
- `plans` - Subscription plans with limits
- `subscriptions` - User subscriptions
- `telegram_links` - Telegram account connections
- `telegram_bot_links` - Bot-specific connections
- `user_brand_configs` - User branding preferences
- `kiwify_events` - Payment webhook events
- `usage_counters` - Daily usage tracking
- `telemetry_events` - System audit logs

## Getting Started

### Prerequisites

- Node.js 20+ installed
- Railway PostgreSQL database (or Supabase/Neon)
- Git installed

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   # Edit .env files with your values
   ```

3. **Setup database**:
   ```bash
   # Create PostgreSQL database on Railway/Supabase
   # Update DATABASE_URL in apps/api/.env

   # Run migrations
   cd apps/api
   npm run migrate
   cd ../..
   ```

4. **Start development**:
   ```bash
   # Terminal 1 - API
   cd apps/api
   npm run dev

   # Terminal 2 - Web
   cd apps/web
   npm run dev
   ```

5. **Open browser**:
   - Web: http://localhost:3000
   - API: http://localhost:4000/health

## Environment Variables

### Web App (`apps/web/.env`)
- `NEXT_PUBLIC_API_BASE_URL` - API endpoint (http://localhost:4000)

### API (`apps/api/.env`)
- `PORT` - Server port (default: 4000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `APP_BASE_URL` - Frontend URL (for email links)
- `EMAIL_SMTP_*` - SMTP configuration (Resend/SendGrid)
- `TELEGRAM_BOT_ARTS_TOKEN` - Bot de Artes token
- `TELEGRAM_BOT_DOWNLOAD_TOKEN` - Bot de Download token
- `KIWIFY_WEBHOOK_SECRET` - Kiwify webhook validation

## Available Scripts

### Root
- `npm run dev` - Start all services
- `npm run build` - Build all projects
- `npm test` - Run all tests
- `npm run lint` - Lint all code

### Web (`apps/web`)
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Lint code

### API (`apps/api`)
- `npm run dev` - Start API dev server (with watch)
- `npm run build` - Compile TypeScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm test` - Run tests

## Features

### User Management
- Email-based authentication
- JWT tokens
- Password reset via email
- Role-based access (USER/ADMIN)

### Subscription System
- Multiple plans (Free Trial, Pro Monthly, Pro Yearly)
- Usage limits enforcement
- Kiwify payment integration
- Automatic renewal/expiration

### Bot de Artes
- Marketplace scraping (Shopee, Mercado Livre, Amazon, Magalu)
- Product data extraction (title, price, image)
- Automated image generation (3 formats: Card, Story, WhatsApp)
- Custom branding (colors, fonts, coupon codes)
- Template system

### Bot de Download
- Social media downloads (Instagram, TikTok, Pinterest)
- Image and video support
- Direct download links

### Rate Limiting
- Per-plan daily limits
- Cooldown between requests
- Usage counter tracking
- Concurrent execution limits

### Admin Dashboard
- User management
- Subscription monitoring
- Telemetry and analytics
- System health monitoring

## Deployment

### Web (Vercel)
1. Connect GitHub repository
2. Configure build settings (auto-detected)
3. Add environment variables
4. Deploy

### API (Railway)
1. Create new project
2. Deploy from GitHub
3. Add PostgreSQL database
4. Configure environment variables
5. Run migrations

### Telegram Bots
1. Create bots with @BotFather
2. Get bot tokens
3. Add tokens to .env
4. Set webhooks (after API deployment)

## Development Workflow

1. Create feature branch
2. Implement changes
3. Test locally
4. Commit changes
5. Push to GitHub
6. Create pull request
7. Deploy after review

## Troubleshooting

### Database connection fails
- Check `DATABASE_URL` in `apps/api/.env`
- Ensure PostgreSQL is running
- Verify network access to Railway/Supabase

### TypeScript errors
- Run `npx tsc --noEmit` to check errors
- Ensure all dependencies are installed
- Check `tsconfig.json` configuration

### Bots not responding
- Verify bot tokens are correct
- Check webhook configuration
- Ensure API is accessible from internet

### Port already in use
- Change `PORT` in `apps/api/.env`
- Kill existing processes: `lsof -ti:4000 | xargs kill -9`

## Architecture Decisions

See `DECISIONS.md` for detailed architectural decision records (ADRs).

Key decisions:
- Cloud-first database strategy (no local PostgreSQL)
- Monorepo with npm workspaces
- TypeScript everywhere
- ESM modules for API
- JWT authentication
- Webhook-based payments

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact: [Your support email]
