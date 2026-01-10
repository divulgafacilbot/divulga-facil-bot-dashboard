# Feature 3: Dashboard Admin - Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Service Layer Architecture](#service-layer-architecture)
4. [Permission Model](#permission-model)
5. [Telemetry & Audit Trail](#telemetry--audit-trail)
6. [4-Bot Metrics Aggregation](#4-bot-metrics-aggregation)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Architectural Decision Records](#architectural-decision-records)

---

## Overview

Feature 3 extends the admin dashboard to support 4 bot types (ARTS, DOWNLOAD, PINTEREST, SUGGESTION) with:

- **Promotional Tokens Management:** Create, rotate, delete, and validate tokens
- **Consolidated Metrics:** 30-day aggregated metrics for all 4 bots
- **Enhanced Support:** Filter tickets by bot type
- **Granular Permissions:** PROMO_TOKENS permission for collaborators

### Key Components

- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **Frontend:** Next.js 14 (App Router) + React + Tailwind CSS
- **Data Fetching:** SWR for client-side data fetching
- **Authentication:** JWT with permission-based access control

---

## Database Schema

### promo_tokens Table

```sql
CREATE TABLE promo_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ(6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_promo_tokens_created_by
    FOREIGN KEY (created_by_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_promo_tokens_bot_type
    CHECK (bot_type IN ('ARTS', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION'))
);
```

### Indexes

```sql
-- Unique index for fast token lookups
CREATE UNIQUE INDEX idx_promo_tokens_token ON promo_tokens(token);

-- Composite index for filtered queries
CREATE INDEX idx_promo_tokens_bot_type_created_at
  ON promo_tokens(bot_type, created_at DESC);

-- Index for expiration queries
CREATE INDEX idx_promo_tokens_bot_type_expires_at
  ON promo_tokens(bot_type, expires_at);

-- Index for active status queries
CREATE INDEX idx_promo_tokens_is_active ON promo_tokens(is_active);

-- Index for created_by queries
CREATE INDEX idx_promo_tokens_created_by_id ON promo_tokens(created_by_id);
```

### Rationale

- **UUID Primary Key:** Prevents enumeration attacks
- **UNIQUE token:** Ensures no duplicate tokens
- **TIMESTAMPTZ:** Time zone aware timestamps for global deployments
- **Soft Delete (is_active):** Preserves audit trail
- **CHECK Constraint:** Enforces valid bot types at database level
- **Foreign Key CASCADE:** Auto-cleanup when admin is deleted

---

## Service Layer Architecture

### PromoTokensService

**Location:** `/apps/api/src/services/admin/promo-tokens.service.ts`

**Responsibilities:**
- Generate cryptographically secure tokens
- CRUD operations on promo_tokens table
- Atomic token rotation using transactions
- Token validation logic
- Integration with TelemetryService for audit events

**Key Methods:**

```typescript
class PromoTokensService {
  // Generate 64-character hex token
  async createToken(input: CreatePromoTokenInput): Promise<PromoToken>

  // List with pagination and filters
  async getTokens(filters: GetPromoTokensFilters): Promise<PromoTokensListResponse>

  // Get single token
  async getTokenById(id: string): Promise<PromoToken | null>

  // Update metadata (name, description, expiresAt)
  async updateToken(id: string, updates: UpdatePromoTokenInput): Promise<PromoToken | null>

  // Soft delete (set is_active = false)
  async deleteToken(id: string, adminId: string): Promise<boolean>

  // Atomic rotation: create new + deactivate old
  async rotateToken(id: string, adminId: string): Promise<PromoToken | null>

  // Validate token for bot consumption
  async validateToken(token: string, botType: BotType): Promise<ValidateTokenResponse>
}
```

**Token Generation:**

```typescript
import { randomBytes } from 'crypto';

const token = randomBytes(32).toString('hex'); // 64 characters
```

Uses Node.js `crypto` module for cryptographically secure random generation.

**Atomic Rotation:**

```typescript
const newToken = await prisma.$transaction(async (tx) => {
  // 1. Deactivate old token
  await tx.promo_tokens.update({
    where: { id },
    data: { is_active: false },
  });

  // 2. Create new token with same properties
  const token = randomBytes(32).toString('hex');
  return await tx.promo_tokens.create({
    data: { ...oldToken, token, created_by_id: adminId },
  });
});
```

Ensures both operations succeed or both fail (ACID compliance).

---

### AdminMetricsService (Updated)

**Location:** `/apps/api/src/services/admin/overview.service.ts`

**New Metrics Added:**

```typescript
interface OverviewKPIs {
  // Existing metrics
  totalUsers: number;
  activeArtsBots: number;
  activeDownloadBots: number;

  // NEW: Pinterest metrics
  activePinterestBots: number;
  totalPinsCreated: number;

  // NEW: Suggestion metrics
  activeSuggestionBots: number;
  totalSuggestionsGenerated: number;
}
```

**Implementation:**

```typescript
const [
  activePinterestBots,
  activeSuggestionBots,
  totalPinsCreated,
  totalSuggestionsGenerated,
] = await Promise.all([
  // Count active Pinterest bot links
  prisma.telegram_links.count({
    where: {
      bot_type: BOT_TYPES.PINTEREST,
      status: 'PENDING',
      expires_at: { gt: now },
    },
  }),

  // Count active Suggestion bot links
  prisma.telegram_links.count({
    where: {
      bot_type: BOT_TYPES.SUGGESTION,
      status: 'PENDING',
      expires_at: { gt: now },
    },
  }),

  // Count Pinterest pins created in last 30 days
  prisma.telemetry_events.count({
    where: {
      event_type: 'PINTEREST_PIN_CREATED',
      created_at: { gte: thirtyDaysAgo },
    },
  }),

  // Count suggestions generated in last 30 days
  prisma.telemetry_events.count({
    where: {
      event_type: 'SUGGESTION_GENERATED',
      created_at: { gte: thirtyDaysAgo },
    },
  }),
]);
```

**30-Day Aggregation Window:**

All metrics use `subDays(now, 30)` for consistency:

```typescript
import { subDays } from 'date-fns';

const thirtyDaysAgo = subDays(new Date(), 30);
```

---

### AdminSupportService (Updated)

**Location:** `/apps/api/src/services/admin/support.service.ts`

**Bot Filtering Added:**

```typescript
interface GetTicketsFilters {
  status?: string;
  priority?: string;
  category?: string;
  userId?: string;
  botType?: string; // NEW
}

static async getTickets(filters: GetTicketsFilters = {}, pagination: Pagination = {}) {
  const where: any = {};

  // NEW: Filter by bot type
  if (filters.botType) {
    const botCategory = `BOT_${filters.botType.toUpperCase()}`;
    where.category = botCategory;
  }

  const tickets = await prisma.support_tickets.findMany({ where, ...});
  return { tickets, pagination };
}
```

**Category Mapping:**
- `botType: 'ARTS'` → `category: 'BOT_ARTS'`
- `botType: 'PINTEREST'` → `category: 'BOT_PINTEREST'`

---

## Permission Model

### AdminPermission Enum

**Location:** `/apps/api/src/constants/admin-enums.ts`

```typescript
export enum AdminPermission {
  OVERVIEW = 'overview',
  USERS = 'users',
  BOTS = 'bots',
  USAGE = 'usage',
  TEMPLATES = 'templates',
  CAMPAIGNS = 'campaigns',
  SUPPORT = 'support',
  FINANCE = 'finance',
  PERMISSIONS = 'permissions',
  PROMO_TOKENS = 'promo_tokens', // NEW
}
```

### Permission Checks

**Middleware:** `requirePermission(AdminPermission.PROMO_TOKENS)`

**Route Protection:**

```typescript
router.post(
  '/',
  requireAdmin,
  requirePermission(AdminPermission.PROMO_TOKENS),
  validateBody(createPromoTokenSchema),
  (req, res) => promoTokensController.createToken(req, res)
);
```

**Logic:**

```typescript
export const requirePermission = (permissionKey: string) => {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    await requireAdmin(req, res, () => {
      // ADMIN_MASTER has all permissions
      if (req.admin?.role === AdminRole.ADMIN_MASTER) {
        return next();
      }

      // Check if collaborator has permission
      if (!req.admin?.permissions.includes(permissionKey)) {
        return res.status(403).json({
          error: `Permission '${permissionKey}' required for this operation`
        });
      }

      next();
    });
  };
};
```

**UI Permission Checks:**

```tsx
{hasPermission('promo_tokens') && (
  <Link href="/admin/promo-tokens">Tokens Promocionais</Link>
)}
```

---

## Telemetry & Audit Trail

### Telemetry Events

All promo token actions log events via `TelemetryService.logEvent()`:

**TOKEN_CREATED:**
```typescript
{
  eventType: 'TOKEN_CREATED',
  userId: adminId,
  metadata: {
    tokenId: promoToken.id,
    botType: input.botType,
    hasExpiration: !!input.expiresAt,
  },
}
```

**TOKEN_ROTATED:**
```typescript
{
  eventType: 'TOKEN_ROTATED',
  userId: adminId,
  metadata: {
    oldTokenId: id,
    newTokenId: newToken.id,
    botType: oldToken.bot_type,
  },
}
```

**TOKEN_DELETED:**
```typescript
{
  eventType: 'TOKEN_DELETED',
  userId: adminId,
  metadata: {
    tokenId: id,
    botType: token.bot_type,
  },
}
```

**TOKEN_VALIDATED:**
```typescript
{
  eventType: 'TOKEN_VALIDATED',
  metadata: {
    tokenId: promoToken?.id || null,
    botType,
    success: boolean,
    reason?: string,
  },
}
```

### Audit Queries

Query telemetry_events table:

```sql
-- Get all token creations by admin
SELECT * FROM telemetry_events
WHERE event_type = 'TOKEN_CREATED'
  AND user_id = 'admin-uuid'
ORDER BY created_at DESC;

-- Get all validations for a specific token
SELECT * FROM telemetry_events
WHERE event_type = 'TOKEN_VALIDATED'
  AND metadata->>'tokenId' = 'token-uuid'
ORDER BY created_at DESC;
```

---

## 4-Bot Metrics Aggregation

### Aggregation Logic

**30-Day Window:**
```typescript
const thirtyDaysAgo = subDays(new Date(), 30);
```

**Active Bots Count:**
```typescript
const activeBotTokens = await prisma.telegram_links.groupBy({
  by: ['bot_type'],
  where: {
    status: 'PENDING',
    expires_at: { gt: now },
  },
  _count: { _all: true },
});

// Reduce to individual counts
const tokenCounts = activeBotTokens.reduce(
  (acc, item) => {
    if (item.bot_type === BOT_TYPES.ARTS) acc.arts += item._count._all;
    if (item.bot_type === BOT_TYPES.DOWNLOAD) acc.download += item._count._all;
    if (item.bot_type === BOT_TYPES.PINTEREST) acc.pinterest += item._count._all;
    if (item.bot_type === BOT_TYPES.SUGGESTION) acc.suggestion += item._count._all;
    return acc;
  },
  { arts: 0, download: 0, pinterest: 0, suggestion: 0 }
);
```

**Usage Counts:**
```typescript
// Pinterest pins created
const totalPinsCreated = await prisma.telemetry_events.count({
  where: {
    event_type: 'PINTEREST_PIN_CREATED',
    created_at: { gte: thirtyDaysAgo },
  },
});

// Suggestions generated
const totalSuggestionsGenerated = await prisma.telemetry_events.count({
  where: {
    event_type: 'SUGGESTION_GENERATED',
    created_at: { gte: thirtyDaysAgo },
  },
});
```

### Cache Strategy

**Redis Caching (30s TTL):**

```typescript
const CACHE_TTL_MS = 30 * 1000;
let cachedOverview: { data: any; expiresAt: number } | null = null;

router.get('/', requireAdmin, async (req, res) => {
  if (cachedOverview && cachedOverview.expiresAt > Date.now()) {
    return res.json({ success: true, data: cachedOverview.data, cached: true });
  }

  const data = await AdminOverviewService.getKPIs();
  cachedOverview = { data, expiresAt: Date.now() + CACHE_TTL_MS };

  res.json({ success: true, data });
});
```

---

## Data Flow Diagrams

### Token Creation Flow

```
┌─────────────┐
│   Admin UI  │
└──────┬──────┘
       │ POST /api/admin/promo-tokens
       ▼
┌──────────────────────────┐
│ PromoTokensController    │
│ - Validate input         │
│ - Extract adminId        │
└──────┬───────────────────┘
       │ createToken()
       ▼
┌──────────────────────────┐
│ PromoTokensService       │
│ - Generate 64-char token │
│ - Insert to database     │
│ - Log telemetry event    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ PostgreSQL Database      │
│ - Insert promo_tokens    │
│ - Insert telemetry_event │
└──────────────────────────┘
```

### Token Validation Flow (Bot Consumption)

```
┌─────────────┐
│   Bot (gra  │
└──────┬──────┘
       │ validateToken(token, botType)
       ▼
┌──────────────────────────┐
│ PromoTokensService       │
│ - Query token by string  │
│ - Check is_active        │
│ - Check expires_at       │
│ - Check bot_type match   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ TelemetryService         │
│ - Log TOKEN_VALIDATED    │
│ - Include success/reason │
└──────────────────────────┘
       │
       ▼
┌─────────────┐
│ Return      │
│ { valid,    │
│   tokenId,  │
│   error? }  │
└─────────────┘
```

### Metrics Aggregation Flow

```
┌─────────────┐
│   Admin UI  │
└──────┬──────┘
       │ GET /api/admin/overview
       ▼
┌──────────────────────────┐
│ OverviewRoutes           │
│ - Check cache (30s TTL)  │
└──────┬───────────────────┘
       │ (cache miss)
       ▼
┌──────────────────────────┐
│ AdminOverviewService     │
│ - getKPIs()              │
└──────┬───────────────────┘
       │ Parallel queries
       ▼
┌──────────────────────────┐
│ PostgreSQL Database      │
│ - Count telegram_links   │
│ - Count telemetry_events │
│ - Aggregate by bot_type  │
│ - Filter by 30-day window│
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Cache Result             │
│ - Store in memory        │
│ - Set expiry: now + 30s  │
└──────┬───────────────────┘
       │
       ▼
┌─────────────┐
│ Return JSON │
└─────────────┘
```

---

## Architectural Decision Records

### ADR-001: Token Generation Method

**Decision:** Use `crypto.randomBytes(32).toString('hex')` for token generation.

**Rationale:**
- Cryptographically secure (CSPRNG)
- 64-character hex string (256 bits of entropy)
- Built-in Node.js module (no external dependencies)
- Industry standard for token generation

**Alternatives Considered:**
- UUID v4: Only 122 bits of entropy, less secure
- nanoid: Additional dependency, 21 chars not enough for our use case
- JWT: Overhead, not suitable for long-lived tokens

---

### ADR-002: Soft Delete Pattern

**Decision:** Use `is_active` flag instead of hard deletes.

**Rationale:**
- Preserves audit trail for compliance
- Allows historical analysis of token usage
- Enables potential future "undelete" feature
- Foreign key constraints remain valid

**Trade-offs:**
- Database grows over time (solution: archive old inactive tokens after X years)
- Queries must filter by `is_active` (solution: add indexes)

---

### ADR-003: Atomic Token Rotation

**Decision:** Use Prisma transactions for token rotation.

**Rationale:**
- Ensures old token is deactivated AND new token is created (ACID)
- Prevents race conditions where old token remains active
- Database-level atomicity guarantees

**Implementation:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.promo_tokens.update({ where: { id }, data: { is_active: false } });
  return await tx.promo_tokens.create({ data: { ... } });
});
```

---

### ADR-004: 30-Day Aggregation Window

**Decision:** Standardize on 30-day window for all metrics.

**Rationale:**
- Consistency across dashboard
- Balances recency with statistical significance
- Aligns with typical business reporting periods (monthly)
- Reduces query complexity (single time filter)

**Trade-offs:**
- Cannot easily view longer periods (90d, 1y) without additional queries
- May not capture seasonal patterns

**Future Enhancement:** Add time range selector (7d, 30d, 90d).

---

### ADR-005: SWR for Client-Side Data Fetching

**Decision:** Use SWR library for React data fetching.

**Rationale:**
- Built for Next.js App Router
- Automatic caching and revalidation
- Optimistic UI updates
- Small bundle size (5KB)
- Built-in error handling and loading states

**Alternatives Considered:**
- React Query: More features but larger bundle (40KB)
- Native fetch: No caching, manual loading states
- Server Components: Not suitable for interactive admin panels

---

## Performance Considerations

### Database Indexes

All critical queries have supporting indexes:
- Token lookups: `UNIQUE(token)`
- Bot type filters: `(bot_type, created_at DESC)`
- Expiration queries: `(bot_type, expires_at)`

### Query Optimization

- Use `Promise.all()` for parallel database queries
- Limit result sets with pagination (default 50, max 100)
- Cache overview data for 30 seconds (Redis or in-memory)

### Frontend Performance

- SWR automatic deduplication (prevents duplicate requests)
- Lazy load modals (code splitting)
- Virtualization for large lists (future enhancement)

---

## Security Considerations

1. **Token Security:**
   - 256-bit entropy makes brute force infeasible
   - Tokens transmitted via HTTPS only
   - No token logging in application logs

2. **Permission Enforcement:**
   - Middleware checks on all routes
   - UI permission checks for menu visibility
   - Role hierarchy (ADMIN_MASTER > COLABORADOR)

3. **Audit Trail:**
   - All actions logged with admin ID
   - Telemetry events immutable (append-only)
   - Audit logs queryable for compliance

4. **Input Validation:**
   - Zod schemas for request validation
   - Database constraints (CHECK, FOREIGN KEY)
   - XSS protection via React (auto-escaping)

---

## Future Enhancements

1. **Token Usage Analytics:**
   - Track how many times each token is used
   - Dashboard widget showing most-used tokens

2. **Bulk Operations:**
   - Create multiple tokens at once
   - Bulk rotation/deletion with filters

3. **Token Templates:**
   - Save token configurations as templates
   - Quick-create tokens from templates

4. **Automated Expiration Notifications:**
   - Email admins when tokens expire soon
   - Webhook integration for external systems

5. **Rate Limiting:**
   - Implement rate limiting on validation endpoint
   - Prevent token brute-force attacks

---

## Conclusion

Feature 3 successfully extends the admin dashboard to support all 4 bot types with robust token management, consolidated metrics, and enhanced support filtering. The architecture prioritizes security, scalability, and maintainability through:

- Atomic database operations
- Comprehensive audit trail
- Permission-based access control
- Efficient caching and indexing
- Clean separation of concerns (Service layer pattern)

For questions or clarifications, refer to the API documentation (`docs/api/promo-tokens.md`) or contact the development team.
