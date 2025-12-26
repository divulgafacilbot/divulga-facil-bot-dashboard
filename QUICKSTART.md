# Quick Start Guide

## Prerequisites
- Node.js 20+ installed
- Railway PostgreSQL database (or Supabase/Neon)
- Git installed

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
# Copy example files
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your values:
- `DATABASE_URL` - Your Railway/Supabase PostgreSQL connection string
- `JWT_SECRET` - Generate with: `openssl rand -hex 32`
- `EMAIL_SMTP_*` - Your Resend/SendGrid SMTP credentials
- `TELEGRAM_BOT_*` - Your bot tokens from @BotFather

Edit `apps/web/.env`:
- `NEXT_PUBLIC_API_BASE_URL` - Keep as `http://localhost:4000` for development

### 3. Setup database
```bash
# Run migrations
cd apps/api
npm run migrate
cd ../..
```

### 4. Start development
```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Web
cd apps/web
npm run dev
```

### 5. Open browser
- Web: http://localhost:3000
- API: http://localhost:4000/health

## Quick Commands

```bash
# Start all services
npm run dev

# Build all projects
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Run migrations
cd apps/api && npm run migrate
```

## Troubleshooting

### Database connection fails
- Check `DATABASE_URL` in `apps/api/.env`
- Ensure PostgreSQL is running
- Verify connection string format: `postgresql://user:password@host:port/database`

### Port already in use
- Change `PORT` in `apps/api/.env` (default: 4000)
- Or kill existing process: `lsof -ti:4000 | xargs kill -9`

### TypeScript errors
- Run `npx tsc --noEmit` in the project directory
- Ensure all dependencies are installed: `npm install`

## Next Steps

1. Read the full README.md for detailed documentation
2. Configure your Telegram bots (@BotFather)
3. Set up payment webhooks (Kiwify)
4. Deploy to production (Vercel + Railway)

## Support

For detailed setup guides, check the `.claude/manuals/` directory for step-by-step instructions on:
- Creating Telegram bots
- Configuring SMTP email
- Setting up databases
- Deploying to production
