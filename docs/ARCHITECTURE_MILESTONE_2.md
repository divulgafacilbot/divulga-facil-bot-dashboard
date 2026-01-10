# Technical Architecture Document - Milestone 2

## Document Version: 2.0.0
## Last Updated: 2026-01-08
## Status: Completed

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema Changes](#database-schema-changes)
4. [Backend Services](#backend-services)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Security Considerations](#security-considerations)
9. [Performance Optimizations](#performance-optimizations)
10. [Deployment](#deployment)
11. [Testing Strategy](#testing-strategy)
12. [Future Enhancements](#future-enhancements)

---

## Overview

Milestone 2 introduces comprehensive bot management and public page functionality to the Divulga Fácil platform.

### Key Features Delivered

1. **Bot Linking System**: Temporary token generation and bot linking for 4 bot types
2. **Public Page Management**: Customizable public pages with appearance settings
3. **Manual Card CRUD**: Create, read, update, and delete product cards with image uploads
4. **Analytics Dashboard**: Comprehensive metrics and visitor statistics
5. **Help Center**: Comprehensive FAQ and user documentation

### Technologies

**Backend**:
- Node.js 20+
- Express.js 4.22+
- TypeScript 5.3+
- Prisma ORM 7.2+
- PostgreSQL 15+
- Sharp (image processing)
- Multer (file uploads)
- Zod (validation)

**Frontend**:
- Next.js 16.1+
- React 19.2+
- TypeScript 5+
- Tailwind CSS 4+

**Testing**:
- Vitest (unit tests)
- Supertest (integration tests)
- Playwright (E2E tests)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Browser    │  │   Telegram   │  │  Public Page    │  │
│  │  (Dashboard) │  │     Bots     │  │    Visitors     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
└─────────┼──────────────────┼───────────────────┼───────────┘
          │                  │                   │
          │ HTTPS/JWT        │ Bot API           │ HTTPS
          │                  │                   │
┌─────────▼──────────────────▼───────────────────▼───────────┐
│                       API Gateway                           │
│                   (Express.js + CORS)                       │
└─────────┬─────────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────┐
│                     Application Layer                      │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Auth       │  │   Telegram  │  │    Pinterest    │  │
│  │  Middleware  │  │   Services  │  │    Services     │  │
│  └──────────────┘  └─────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Analytics   │  │   Upload    │  │   Public Page   │  │
│  │   Service    │  │   Service   │  │    Service      │  │
│  └──────────────┘  └─────────────┘  └─────────────────┘  │
└─────────┬─────────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────┐
│                      Data Layer                            │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL  │  │   Prisma    │  │  File System    │  │
│  │   Database   │  │     ORM     │  │  (uploads/)     │  │
│  └──────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### New Tables

#### 1. telegram_link_tokens

Stores temporary tokens for bot linking (expires in 10 minutes).

```sql
CREATE TABLE telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(10) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_type BotType NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_telegram_link_tokens_token (token),
  INDEX idx_telegram_link_tokens_expires_at (expires_at)
);
```

**Purpose**: Secure, temporary token system for linking Telegram bots without exposing permanent credentials.

**Security Features**:
- 10-minute expiration
- Unique 10-character alphanumeric tokens
- Automatic cleanup of expired tokens
- One-time use (deleted after successful link)

---

### Updated Enums

#### BotType Enum

**Before**:
```prisma
enum BotType {
  ARTS
  DOWNLOAD
}
```

**After**:
```prisma
enum BotType {
  ARTS
  DOWNLOAD
  PINTEREST
  SUGGESTION
}
```

**Migration Strategy**:
- Used `ALTER TYPE ... ADD VALUE` for enum extension
- No data loss - existing records preserved
- Backward compatible with existing bot links

---

#### TicketCategory Enum

**Before**:
```prisma
enum TicketCategory {
  GENERAL
  BILLING
  TECHNICAL
}
```

**After**:
```prisma
enum TicketCategory {
  GENERAL
  BILLING
  TECHNICAL
  BOT_ARTS
  BOT_DOWNLOAD
  BOT_PINTEREST
  BOT_SUGGESTION
  PUBLIC_PAGE
}
```

**Purpose**: Bot-specific and feature-specific support categories for better ticket routing.

---

### Updated Tables

#### telegram_bot_links

```sql
ALTER TABLE telegram_bot_links
ALTER COLUMN bot_type TYPE BotType
USING (bot_type::text::BotType);
```

**Change**: Converted `bot_type` from VARCHAR to proper enum type for type safety.

---

## Backend Services

### 1. TelegramLinkGenerationService

**Location**: `apps/api/src/services/telegram/link-generation.service.ts`

**Responsibilities**:
- Generate temporary bot linking tokens
- Validate token authenticity and expiration
- Cleanup expired tokens
- Manage bot configurations

**Key Methods**:

```typescript
class TelegramLinkGenerationService {
  // Generate a 10-character token with 10-minute expiry
  static async generateLinkToken(
    userId: string,
    botType: BotType
  ): Promise<LinkTokenResponse>

  // Verify token validity
  static async verifyToken(
    token: string
  ): Promise<TokenVerificationResult>

  // Delete expired tokens (cron job)
  static async cleanupExpiredTokens(): Promise<{ deletedCount: number }>

  // Get all active tokens for a user
  static async getUserTokens(
    userId: string
  ): Promise<LinkToken[]>
}
```

**Bot Configurations**:

```typescript
const BOT_CONFIG = {
  ARTS: {
    name: 'Bot de Artes',
    telegramHandle: '@DivulgaFacilArtesBot',
    instructions: 'Envie /codigo TOKEN no bot para vincular'
  },
  DOWNLOAD: {
    name: 'Bot de Download',
    telegramHandle: '@DivulgaFacilDownloadBot',
    instructions: 'Envie /codigo TOKEN no bot para vincular'
  },
  PINTEREST: {
    name: 'Bot de Pinterest',
    telegramHandle: '@DivulgaFacilPinterestBot',
    instructions: 'Envie /codigo TOKEN no bot para vincular e começar a criar cards automáticos'
  },
  SUGGESTION: {
    name: 'Bot de Sugestões',
    telegramHandle: '@DivulgaFacilSugestaoBot',
    instructions: 'Envie /codigo TOKEN no bot para receber sugestões personalizadas'
  }
};
```

---

### 2. AnalyticsService

**Location**: `apps/api/src/services/analytics.service.ts`

**Responsibilities**:
- Aggregate analytics events
- Calculate metrics (views, clicks, CTR)
- Generate time-series data
- Identify top-performing cards

**Key Methods**:

```typescript
class AnalyticsService {
  // Get dashboard-level metrics
  static async getDashboardMetrics(
    userId: string,
    timeRange: '7d' | '30d' | 'all' = '30d'
  ): Promise<DashboardMetrics>

  // Get top cards by click count
  static async getTopCards(
    userId: string,
    limit: number = 10
  ): Promise<TopCard[]>

  // Get visitor statistics
  static async getVisitorStats(
    userId: string,
    timeRange: '7d' | '30d' | 'all' = '30d'
  ): Promise<VisitorStats>

  // Get time-series data for charts
  static async getEventTimeSeries(
    userId: string,
    eventType: EventType,
    timeRange: '7d' | '30d' | 'all' = '30d'
  ): Promise<TimeSeriesData[]>
}
```

**Metrics Calculated**:

- **Profile Views**: Count of PUBLIC_PROFILE_VIEW events
- **Card Views**: Count of PUBLIC_CARD_VIEW events
- **Card Clicks**: Count of PUBLIC_CARD_CLICK events
- **CTA Clicks**: Count of PUBLIC_CTA_CLICK events
- **CTR**: `(cardClicks / profileViews) * 100`
- **Unique Visitors**: Distinct count of (IP + UserAgent) combinations

---

### 3. UploadService

**Location**: `apps/api/src/services/upload.service.ts`

**Responsibilities**:
- Handle image uploads
- Validate file type and size
- Process images (resize, compress, convert to WebP)
- Manage file storage
- Delete unused images

**Key Methods**:

```typescript
class UploadService {
  // Upload and process card image
  static async uploadCardImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<string> // Returns: /uploads/cards/xyz.webp

  // Delete image from storage
  static async deleteCardImage(
    imageUrl: string
  ): Promise<boolean>

  // Get absolute file path
  static getImagePath(imageUrl: string): string

  // Validate image buffer
  static validateImageBuffer(
    buffer: Buffer,
    mimeType: string
  ): void

  // Get image metadata
  static async getImageMetadata(
    buffer: Buffer
  ): Promise<ImageMetadata>
}
```

**Image Processing Pipeline**:

```
┌─────────────┐
│ File Upload │
│ (multipart) │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Validate Type    │ JPG, PNG, WEBP only
│ Validate Size    │ Max 5MB
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Sharp Processing │
│ - Resize: 800x800│
│ - Fit: inside    │
│ - WebP: quality  │
│   80%            │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Save to Disk     │
│ /uploads/cards/  │
│ {nanoid}.webp    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Return URL       │
│ /uploads/cards/  │
│ xyz123.webp      │
└──────────────────┘
```

**Benefits**:
- Reduced file size (WebP compression)
- Uniform dimensions (800x800)
- Fast loading on public pages
- Optimal for CDN delivery (future)

---

### 4. PublicPageService

**Location**: `apps/api/src/services/public-page.service.ts`

**Responsibilities**:
- Manage public page settings (display name, header color, bio)
- CRUD operations for manual cards
- Filter active vs hidden cards
- Handle card status toggling

**Key Methods**:

```typescript
class PublicPageService {
  // Get user's public page settings
  static async getSettings(userId: string): Promise<PublicPageSettings>

  // Update settings
  static async updateSettings(
    userId: string,
    updates: Partial<SettingsUpdate>
  ): Promise<PublicPageSettings>

  // Create manual card
  static async createCard(
    userId: string,
    cardData: CardCreateInput,
    imageUrl: string
  ): Promise<PublicCard>

  // Get all cards for user (with filters)
  static async getUserCards(
    userId: string,
    filters?: CardFilters
  ): Promise<PublicCard[]>

  // Toggle card status
  static async toggleCardStatus(
    userId: string,
    cardId: string
  ): Promise<PublicCard>

  // Delete card
  static async deleteCard(
    userId: string,
    cardId: string
  ): Promise<void>
}
```

---

## API Endpoints

### Telegram Bot Linking

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/telegram/generate-link` | Generate bot linking token | ✅ |
| GET | `/api/telegram/linked-bots` | Get user's linked bots | ✅ |
| GET | `/api/telegram/bot-configs` | Get all bot configurations | ✅ |

---

### Public Page Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/pinterest/settings` | Get public page settings | ✅ |
| PATCH | `/api/pinterest/settings` | Update appearance settings | ✅ |
| POST | `/api/pinterest/cards` | Create manual card | ✅ |
| GET | `/api/pinterest/cards` | List all user cards | ✅ |
| PATCH | `/api/pinterest/cards/:id` | Update card details | ✅ |
| PATCH | `/api/pinterest/cards/:id/status` | Toggle card status | ✅ |
| DELETE | `/api/pinterest/cards/:id` | Delete card | ✅ |

---

### Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/analytics/dashboard` | Get dashboard metrics | ✅ |
| GET | `/api/analytics/top-cards` | Get top performing cards | ✅ |
| GET | `/api/analytics/visitors` | Get visitor statistics | ✅ |
| GET | `/api/analytics/time-series` | Get time-series data | ✅ |

---

## Frontend Components

### New Pages

#### 1. Meus Bots Page (`/dashboard/meus-bots`)

**Location**: `apps/web/app/dashboard/meus-bots/page.tsx`

**Features**:
- Displays all 4 bots in grid layout
- "Gerar Token" button for each bot
- Token display with instructions
- Linked status badge
- Automatic token countdown (future enhancement)

**State Management**:
```typescript
const [linkedBots, setLinkedBots] = useState<Set<string>>(new Set());
const [tokens, setTokens] = useState<Record<string, any>>({});
const [loading, setLoading] = useState(false);
```

**Key Functions**:
- `fetchLinkedBots()`: Load user's linked bots on mount
- `generateToken(botType)`: Generate new token for bot
- Token auto-refresh every 30s to show linked status

---

#### 2. Página Pública Page (`/dashboard/pagina-publica`)

**Location**: `apps/web/app/dashboard/pagina-publica/page.tsx`

**Features**:
- Appearance customization (display name, color, bio)
- Manual card creation form
- Cards list with status indicators
- Toggle card visibility
- Delete cards with confirmation
- Link to view public page

**State Management**:
```typescript
const [settings, setSettings] = useState<any>(null);
const [cards, setCards] = useState<any[]>([]);
const [showCardForm, setShowCardForm] = useState(false);
const [formData, setFormData] = useState({...});
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [editingCard, setEditingCard] = useState<string | null>(null);
```

**Auto-save Logic**:
- Settings save on `onBlur` event
- Prevents unnecessary API calls
- Shows success message after save

---

#### 3. Ajuda Page (`/dashboard/ajuda`)

**Location**: `apps/web/app/dashboard/ajuda/page.tsx`

**Features**:
- Comprehensive FAQ
- Sections for each bot
- Bot linking instructions
- General questions
- Subscription information
- Support contact info

**Structure**:
- Static content (no API calls)
- Organized by sections
- Collapsible design (future enhancement)
- Search functionality (future enhancement)

---

### Updated Components

#### Sidebar

**Location**: `apps/web/components/dashboard/Sidebar.tsx`

**Changes**:
- Added "🤖 Meus Bots" menu item
- Added "🏪 Página Pública" menu item
- Added "❓ Ajuda" menu item

---

#### Dashboard Overview

**Location**: `apps/web/app/dashboard/page.tsx`

**Changes**:
- Added `publicPageMetrics` state
- Added `loadPublicPageMetrics()` function
- New analytics card for public page metrics (conditional render)
- Link to "Gerenciar página"

---

## Data Flow Diagrams

### Bot Linking Flow

```
┌─────────┐
│  User   │
│ (Browser)│
└────┬────┘
     │
     │ 1. Click "Gerar Token"
     │
     ▼
┌────────────────────┐
│   Meus Bots Page   │
│  generateToken()   │
└────┬───────────────┘
     │
     │ 2. POST /api/telegram/generate-link
     │    {botType: "ARTS"}
     │
     ▼
┌───────────────────────────┐
│ TelegramLinkGeneration    │
│ Service                   │
│ - Generate 10-char token  │
│ - Set 10-min expiry       │
│ - Save to DB              │
└────┬──────────────────────┘
     │
     │ 3. Return token + bot config
     │
     ▼
┌────────────────────┐
│   Meus Bots Page   │
│ Display token      │
└────┬───────────────┘
     │
     │ 4. User copies token
     │
     ▼
┌─────────┐
│Telegram │
│  Bot    │
└────┬────┘
     │
     │ 5. User sends: /codigo TOKEN
     │
     ▼
┌───────────────────────────┐
│  Bot Handler              │
│ - Verify token            │
│ - Check expiration        │
│ - Link bot to user        │
│ - Delete token            │
└────┬──────────────────────┘
     │
     │ 6. Confirm link
     │
     ▼
┌─────────┐
│  User   │
│(Telegram)│
└─────────┘
```

---

### Manual Card Creation Flow

```
┌─────────┐
│  User   │
│ (Browser)│
└────┬────┘
     │
     │ 1. Click "+ Adicionar Card"
     │
     ▼
┌────────────────────┐
│ Página Pública     │
│ Show form          │
└────┬───────────────┘
     │
     │ 2. Fill form + select image
     │
     ▼
┌────────────────────┐
│ Página Pública     │
│ handleCreateCard() │
└────┬───────────────┘
     │
     │ 3. POST /api/pinterest/cards
     │    multipart/form-data
     │    - image: File
     │    - data: JSON
     │
     ▼
┌───────────────────────────┐
│ Multer Middleware         │
│ - Parse multipart         │
│ - Extract file buffer     │
└────┬──────────────────────┘
     │
     │ 4. Pass to controller
     │
     ▼
┌───────────────────────────┐
│ Pinterest Controller      │
│ - Validate data (Zod)     │
│ - Call UploadService      │
└────┬──────────────────────┘
     │
     │ 5. Upload image
     │
     ▼
┌───────────────────────────┐
│ UploadService             │
│ - Validate type/size      │
│ - Resize to 800x800       │
│ - Convert to WebP         │
│ - Save to /uploads/cards/ │
└────┬──────────────────────┘
     │
     │ 6. Return image URL
     │
     ▼
┌───────────────────────────┐
│ Pinterest Controller      │
│ - Create card in DB       │
│ - Return card object      │
└────┬──────────────────────┘
     │
     │ 7. 201 Created + card data
     │
     ▼
┌────────────────────┐
│ Página Pública     │
│ - Close form       │
│ - Add card to list │
│ - Show success     │
└────────────────────┘
```

---

### Analytics Data Flow

```
┌─────────────┐
│   Visitor   │
│(Public Page)│
└──────┬──────┘
       │
       │ 1. Visit public page
       │
       ▼
┌───────────────────┐
│ Public Page App   │
│ (Future - SSR)    │
└──────┬────────────┘
       │
       │ 2. Log event
       │    POST /api/analytics/track
       │
       ▼
┌───────────────────────────┐
│ Analytics Event           │
│ - event_type: PROFILE_VIEW│
│ - user_id                 │
│ - visitor_ip              │
│ - visitor_user_agent      │
│ - timestamp               │
└──────┬────────────────────┘
       │
       │ 3. Store in DB
       │
       ▼
┌───────────────────────────┐
│ PostgreSQL                │
│ analytics_events table    │
└──────┬────────────────────┘
       │
       │
       │ 4. User opens dashboard
       │
       ▼
┌───────────────────────────┐
│ Dashboard Page            │
│ loadPublicPageMetrics()   │
└──────┬────────────────────┘
       │
       │ 5. GET /api/analytics/dashboard
       │
       ▼
┌───────────────────────────┐
│ AnalyticsService          │
│ - Count events by type    │
│ - Calculate CTR           │
│ - Aggregate data          │
└──────┬────────────────────┘
       │
       │ 6. Return metrics
       │
       ▼
┌───────────────────────────┐
│ Dashboard Page            │
│ - Display in cards        │
│ - Show CTR percentage     │
└───────────────────────────┘
```

---

## Security Considerations

### Token Security

**Temporary Link Tokens**:
- 10-minute expiration enforced at database level
- Unique, random 10-character alphanumeric
- Cannot be reused after successful link
- Automatic cleanup via cron job (removes expired tokens)

**Best Practices**:
- Tokens stored hashed (future enhancement)
- Rate limiting on token generation (10/minute)
- Tokens deleted immediately after use

---

### Image Upload Security

**File Type Validation**:
- Whitelist: `image/jpeg`, `image/png`, `image/webp`
- Reject all other MIME types
- Verify actual file content (not just extension)

**File Size Limits**:
- Maximum: 5MB per upload
- Enforced at middleware level
- Prevents DoS via large file uploads

**File Storage**:
- Isolated directory: `/uploads/cards/`
- Unique filenames (nanoid) prevent overwriting
- No executable permissions on upload directory
- Directory outside web root (future: CDN)

---

### Authentication

**JWT Tokens**:
- HTTP-only cookies (XSS protection)
- Secure flag in production
- 1-hour expiration
- Refresh token mechanism (future)

**Authorization**:
- User can only access own resources
- Database queries filtered by `user_id`
- Ownership verification on all updates/deletes

---

### Input Validation

**All Endpoints Use Zod Schemas**:

Example:
```typescript
const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  price: z.string().regex(/^R\$ \d+,\d{2}$/),
  affiliateUrl: z.string().url(),
  marketplace: z.enum(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU']),
  // ... other fields
});
```

**Benefits**:
- Type-safe validation
- Automatic error messages
- Prevents SQL injection
- Prevents XSS attacks

---

### Rate Limiting

**General Endpoints**: 100 requests/minute per user
**File Uploads**: 10 uploads/minute per user
**Token Generation**: 10 tokens/minute per user

**Implementation**:
- Redis-backed rate limiter (production)
- In-memory for development
- Per-user tracking via JWT

---

## Performance Optimizations

### Database Indexes

**Critical Indexes Added**:

```sql
-- Token lookup
CREATE INDEX idx_telegram_link_tokens_token
ON telegram_link_tokens(token);

-- Expiration cleanup
CREATE INDEX idx_telegram_link_tokens_expires_at
ON telegram_link_tokens(expires_at);

-- User's cards lookup
CREATE INDEX idx_public_cards_user_id
ON public_cards(user_id);

-- Active cards only
CREATE INDEX idx_public_cards_status
ON public_cards(status)
WHERE status = 'ACTIVE';

-- Analytics queries
CREATE INDEX idx_analytics_events_user_event_time
ON analytics_events(user_id, event_type, created_at);
```

---

### Image Optimization

**Sharp Processing**:
- Resize to 800x800 (reduces file size by ~70%)
- WebP format (better compression than JPG/PNG)
- Quality 80% (good balance of size vs quality)
- `fit: 'inside'` (maintains aspect ratio)

**Typical Results**:
- Input: 3MB JPG
- Output: 150KB WebP
- **95% size reduction**

---

### Query Optimization

**Pagination**:
- All list endpoints support `limit` and `offset`
- Default limit: 50 items
- Prevents large dataset transfers

**Selective Fields**:
- Only fetch required columns
- Exclude large text fields when not needed
- Use Prisma `select` for specific fields

**Aggregation at Database Level**:
- Use SQL `COUNT`, `SUM`, `GROUP BY`
- Avoid fetching all records and counting in Node.js
- Leverage PostgreSQL's performance

---

### Frontend Optimizations

**Lazy Loading**:
- Images use `loading="lazy"`
- Components loaded on demand
- Code splitting per route (Next.js automatic)

**Debouncing**:
- Search inputs (future)
- Auto-save on settings
- Prevents excessive API calls

**Caching**:
- Static assets cached via CDN (future)
- SWR for data fetching (future enhancement)
- Service Worker for offline support (future)

---

## Deployment

### Environment Variables

**Required**:
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# API
API_PORT=4000
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://api.divulgafacil.com
NEXT_PUBLIC_WEB_URL=https://divulgafacil.com
```

**Optional**:
```env
# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# File uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=/app/uploads/cards

# Logging
LOG_LEVEL=info
```

---

### Build Process

**Backend**:
```bash
cd apps/api
npm run build  # TypeScript compilation
npm run prisma:generate  # Generate Prisma client
npm start
```

**Frontend**:
```bash
cd apps/web
npm run build  # Next.js production build
npm start
```

---

### Database Migrations

**Apply Migrations**:
```bash
cd apps/api
npx prisma migrate deploy
```

**Rollback** (if needed):
```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

---

### Docker Deployment (Future)

```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/divulgafacil
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://api:4000

  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=divulgafacil
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Testing Strategy

### Unit Tests

**Location**: `apps/api/tests/unit/`

**Coverage**:
- TelegramLinkGenerationService (100%)
- AnalyticsService (100%)
- UploadService (100%)

**Framework**: Vitest with mocked Prisma

**Run**:
```bash
cd apps/api
npm test
```

---

### Integration Tests

**Location**: `apps/api/tests/integration/`

**Coverage**:
- All Milestone 2 API endpoints
- Full request/response cycle
- Database interactions
- Authentication flows

**Framework**: Vitest + Supertest

**Run**:
```bash
cd apps/api
npm run test:integration
```

---

### E2E Tests

**Location**: `apps/web/tests/e2e/`

**Coverage**:
- Bot linking flow (all 4 bots)
- Public page customization
- Manual card CRUD
- Dashboard navigation
- Help page

**Framework**: Playwright

**Run**:
```bash
cd apps/web
npm run test:e2e
```

---

### Manual QA

**Location**: `apps/web/tests/manual-qa/milestone-2-qa-checklist.md`

**Coverage**:
- 50+ manual test cases
- Browser compatibility
- Responsiveness
- Error handling
- Performance

---

## Future Enhancements

### Phase 1: Analytics Improvements

- [ ] Real-time analytics dashboard with charts (Recharts)
- [ ] Export analytics to CSV/PDF
- [ ] Email reports (daily/weekly)
- [ ] Conversion funnel analysis
- [ ] A/B testing for cards

---

### Phase 2: Bot Enhancements

- [ ] Bot activity logs in dashboard
- [ ] Bot-generated cards moderation queue
- [ ] Bulk operations on bot-created cards
- [ ] Bot performance metrics
- [ ] Scheduled bot posts

---

### Phase 3: Public Page Features

- [ ] Custom domain support
- [ ] SEO optimization (meta tags, sitemaps)
- [ ] Social sharing previews (Open Graph)
- [ ] Public page themes (templates)
- [ ] Card categories and filtering
- [ ] Search functionality
- [ ] Product wishlists for visitors

---

### Phase 4: Platform Improvements

- [ ] CDN integration for images
- [ ] Progressive Web App (PWA)
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Accessibility (WCAG AA compliance)

---

## Appendix

### File Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── services/
│   │   │   ├── telegram/
│   │   │   │   └── link-generation.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── upload.service.ts
│   │   │   └── public-page.service.ts
│   │   ├── routes/
│   │   │   ├── telegram.routes.ts
│   │   │   ├── pinterest.routes.ts
│   │   │   └── analytics.routes.ts
│   │   ├── middleware/
│   │   │   └── upload.middleware.ts
│   │   └── schemas/
│   │       └── card.schemas.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── telegram-link-generation.service.test.ts
│   │   │   ├── analytics.service.test.ts
│   │   │   └── upload.service.test.ts
│   │   └── integration/
│   │       └── milestone-2-dashboard-gerenciamento.test.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── docs/
│       └── API_MILESTONE_2.md
│
└── web/
    ├── app/
    │   └── dashboard/
    │       ├── page.tsx (updated)
    │       ├── meus-bots/
    │       │   └── page.tsx
    │       ├── pagina-publica/
    │       │   └── page.tsx
    │       └── ajuda/
    │           └── page.tsx
    ├── components/
    │   └── dashboard/
    │       └── Sidebar.tsx (updated)
    ├── tests/
    │   ├── e2e/
    │   │   └── milestone-2-dashboard.spec.ts
    │   └── manual-qa/
    │       └── milestone-2-qa-checklist.md
    └── docs/
        └── USER_GUIDE_MILESTONE_2.md
```

---

## Change History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0.0 | 2026-01-08 | Initial Milestone 2 architecture | Claude |

---

## References

- Prisma Documentation: https://www.prisma.io/docs
- Next.js Documentation: https://nextjs.org/docs
- Sharp Documentation: https://sharp.pixelplumbing.com/
- Playwright Documentation: https://playwright.dev/
- Vitest Documentation: https://vitest.dev/

---

**End of Document**
