# Feature 7 Backend Consolidation - Audit Report

**Date**: 2026-01-08
**Feature**: Backend Consolidation & Integration
**Auditor**: Claude Code (Automated)

---

## Executive Summary

This audit reviewed the existing backend implementation across Features 1-6 to identify:
1. Existing infrastructure that can be reused
2. Gaps that need to be filled
3. Duplicate code that needs consolidation
4. Privacy/security issues that need fixing

**Overall Status**: 60% of Feature 7 objectives are already implemented. Remaining work focuses on consolidation, cleanup, and filling gaps.

---

## 1. Enums Analysis

### ✅ Already Consolidated (in `schema.prisma`)

| Enum | Values | Status |
|------|--------|--------|
| `Marketplace` | MERCADO_LIVRE, SHOPEE, AMAZON, MAGALU | ✅ Consolidated |
| `CardSource` | BOT, MANUAL | ✅ Consolidated |
| `CardStatus` | ACTIVE, HIDDEN, BLOCKED, ERROR | ✅ Consolidated |
| `PublicEventType` | PUBLIC_PROFILE_VIEW, PUBLIC_CARD_VIEW, PUBLIC_CTA_CLICK, PUBLIC_CARD_CLICK | ✅ Consolidated |
| `BotType` | ARTS, DOWNLOAD, PINTEREST, SUGGESTION | ✅ Existing |

### ❌ Inconsistencies Found

1. **`marketplace_products` table** (line 665):
   - Uses `String` for `marketplace` field (should use `Marketplace` enum)
   - Uses `String` for `source` field (should use `CardSource` enum)
   - **Impact**: Type inconsistency, no database-level validation

2. **`RefreshToken` table** (line 132):
   - Stores raw `ip_address` (VARCHAR 45)
   - **Privacy Issue**: Should store `ip_hash` instead
   - **Action Required**: Add `ip_hash` field, deprecate `ip_address`

---

## 2. Tracking Infrastructure

### ✅ Already Implemented

**File**: `src/utils/tracking.util.ts`

| Function | Purpose | Status |
|----------|---------|--------|
| `hashIP(ip, userAgent)` | SHA-256 hash with salt & truncation | ✅ Implemented |
| `truncateIP(ip)` | IPv4 /24, IPv6 /64 | ✅ Implemented |
| `sanitizeUserAgent(ua)` | Truncate to 160 chars | ✅ Implemented |
| `sanitizeReferrer(ref)` | Remove sensitive params, truncate to 200 | ✅ Implemented |
| `isBot(ua)` | Detect bot patterns | ✅ Implemented |
| `generateVisitorKey(visitorId, ipHash)` | Priority: visitorId > ipHash | ✅ Implemented |
| `generateDedupeKey(visitorKey, eventType, cardId)` | Generate unique key | ✅ Implemented |
| `getDedupeWindow(eventType)` | Returns TTL in seconds | ✅ Implemented |

**File**: `src/services/pinterest/tracking.service.ts`

| Feature | Status |
|---------|--------|
| Bot filtering | ✅ Implemented (line 47) |
| IP hashing | ✅ Implemented (line 52) |
| Deduplication | ✅ Implemented (line 56-61) |
| Event tracking | ✅ Implemented (line 64-79) |
| TTL cleanup (30 days) | ✅ Implemented (line 172-185) |
| Analytics | ✅ Implemented (line 133-152) |

### ❌ Missing Components

1. **Visitor ID Utilities** (`src/utils/visitor-id.utils.ts`):
   - `getOrCreateVisitorId(req, res)` - Generate or retrieve from cookie/header
   - `generateVisitorId()` - Create UUID
   - `isValidVisitorId(id)` - Validate UUID format
   - Cookie handling with httpOnly, secure, sameSite

2. **Consolidated Constants** (`src/constants/tracking-config.ts`):
   - TRACKING_CONFIG (visitorId cookie settings)
   - BOT_PATTERNS (comprehensive regex list)
   - RATE_LIMITS (centralized config)
   - DEDUPE_WINDOWS (event-specific)

3. **`public_events.expires_at` field**:
   - Current: TTL calculated from `created_at`
   - Feature 5 integration: Should have explicit `expires_at` field
   - **Action**: Add field to schema, integrate with housekeeping job

---

## 3. Rate Limiting

### ✅ Already Implemented (Redis-based)

**File**: `src/middleware/rate-limit.middleware.ts`

| Limiter | Window | Max | Key | Status |
|---------|--------|-----|-----|--------|
| `ctaRateLimit` | 1 min | 20 | visitorId \|\| IP | ✅ Implemented |
| `eventsRateLimit` | 1 min | 30 | visitorId \|\| IP | ✅ Implemented |
| `publicRateLimit` | 1 min | 100 | IP | ✅ Implemented |

**Dependencies**:
- Uses Redis (ioredis + rate-limit-redis)
- Environment: `REDIS_URL` (defaults to localhost:6379)

### ⚠️ Discrepancies with Task Requirements

| Task Requirement | Current Implementation | Delta |
|------------------|------------------------|-------|
| Views: 5/min per IP | General public: 100/min per IP | ❌ Too permissive |
| Clicks: 10/min per visitor | CTA: 20/min per visitor | ❌ Too permissive |

**Recommendation**: Update rate limits to match Feature 7 spec OR document rationale for higher limits.

---

## 4. Anti-Inflation Middlewares

### ✅ Implemented (in Service Layer)

**File**: `src/services/pinterest/tracking.service.ts`

| Feature | Location | Status |
|---------|----------|--------|
| Bot filtering | Line 47-49 | ✅ In service (not middleware) |
| Deduplication | Line 56-82 | ✅ In service (not middleware) |
| Rate limiting | Applied in routes | ✅ Via middleware |

### ❌ Missing: Middleware Stack Architecture

Current: Rate limiting is middleware, but bot filter + dedupe are in service layer.

**Task Requirement**: Middleware stack: `botFilter → visitorId → rateLimit → dedupe`

**Action Required**:
1. Create `src/middleware/bot-filter.middleware.ts` (extract from service)
2. Create `src/middleware/visitor-id.middleware.ts` (new)
3. Create `src/middleware/dedupe.middleware.ts` (extract from service)
4. Update routes to use full stack

**Rationale**: Middleware architecture provides:
- Early request rejection (less processing)
- Clearer separation of concerns
- Easier to test in isolation
- Reusable across routes

---

## 5. Database Schema

### ✅ Soft Delete Implemented

**Table**: `public_cards`
- Field: `status` (CardStatus enum)
- Values: ACTIVE, HIDDEN, BLOCKED, ERROR
- **Status**: ✅ Soft delete functional

### ✅ Tracking Tables

**Table**: `public_events`
- Fields: `visitor_id`, `ip_hash`, `user_agent`, `created_at`
- **Missing**: `expires_at` field
- **Action**: Add field for Feature 5 TTL integration

**Table**: `public_event_dedupe`
- Fields: `dedupe_key` (PK), `expires_at`
- **Status**: ✅ Functional

### ✅ Indexes

**`public_cards`** (line 592-596):
```prisma
@@index([user_id, status, created_at(sort: Desc), id(sort: Desc)])
@@index([user_id, marketplace, status, created_at(sort: Desc)])
@@index([user_id, category, status, created_at(sort: Desc)])
@@index([user_id, source, status])
```
**Status**: ✅ Optimized for dashboard queries

**`public_events`** (line 618-621):
```prisma
@@index([user_id, event_type, created_at(sort: Desc)])
@@index([card_id, event_type, created_at(sort: Desc)])
@@index([created_at])
```
**Status**: ✅ Adequate for analytics

**Potential Optimization**:
- Add composite index: `[user_id, created_at(sort: Desc), event_type]` for faster dashboard queries
- Add `expires_at` index for housekeeping efficiency

---

## 6. Services Consolidation

### ❌ Services Not Consolidated

**Current State**:
- `src/services/pinterest/public-page.service.ts` (Feature 4)
- `src/services/pinterest/public-card.service.ts` (Feature 4)
- `src/services/pinterest/tracking.service.ts` (Feature 1)

**Required**:
- `src/services/public-event.service.ts` (consolidate tracking)
- `src/services/metrics.service.ts` (consolidate analytics)
- `src/services/card.service.ts` (consolidate card operations with soft delete)

**Action**: Create unified services that:
1. Use consolidated enums
2. Implement soft delete consistently
3. Integrate with Feature 5 TTL system
4. Provide consistent API across features

---

## 7. Controllers & Routes

### ✅ Existing Structure

**File**: `src/controllers/public/public.controller.ts`
- `getPublicProfile()` - SSR view tracking
- `getPublicCard()` - SSR card view
- `listCards()` - Pagination
- `redirectToAffiliate()` - CTA tracking + redirect
- `trackEvent()` - CSR event tracking

**File**: `src/routes/public.routes.ts`
- Rate limiting applied ✅
- Validation middleware applied ✅

### ⚠️ Issues Found

1. **Tracking in Controller** (line 142-158):
   - Calls `TrackingService.trackEvent()` with raw IP (line 148)
   - **Issue**: Raw IP passed to service
   - **Fix**: Should hash in middleware, pass `req.ipHash`

2. **Missing Middleware Stack**:
   - Routes apply rate limiting
   - Missing: bot filter, visitor ID, dedupe middlewares

---

## 8. Validators

### ✅ Existing Validators

**File**: `src/validators/public.validators.ts`
- `ListCardsQuerySchema` (Zod)
- `TrackEventBodySchema` (Zod)
- `SlugParamSchema` (Zod)
- `CardSlugParamSchema` (Zod)

### ❌ Missing Validators

1. **Public Event Validator** (`public-event.validator.ts`):
   - Validate visitorId (UUID)
   - Validate eventType (enum)
   - Sanitize metadata

2. **Card Validator** (`card.validator.ts`):
   - Validate marketplace (enum)
   - Validate source (enum)
   - Validate status (enum)
   - Validate URLs

---

## 9. Integration with Features 1-6

### Feature 1: Public Marketplace

| Component | Status | Notes |
|-----------|--------|-------|
| Tables | ✅ Created | public_page_settings, public_cards, public_events |
| Enums | ✅ Using | Marketplace, CardStatus, PublicEventType |
| Tracking | ✅ Implemented | TrackingService functional |

### Feature 2: Dashboard

| Component | Status | Notes |
|-----------|--------|-------|
| Soft delete | ✅ Implemented | CardStatus: HIDDEN |
| Indexes | ✅ Optimized | user_id + status + created_at |

### Feature 3: Admin

| Component | Status | Notes |
|-----------|--------|-------|
| Metrics | ⚠️ Partial | TrackingService.getAnalytics() exists |
| Consolidated API | ❌ Missing | Need metrics.service.ts |

### Feature 4: Pinterest Bot

| Component | Status | Notes |
|-----------|--------|-------|
| Enum usage | ❌ Inconsistent | marketplace_products uses String |
| Services | ✅ Functional | public-page, public-card services |

### Feature 5: Time Infrastructure & TTL

| Component | Status | Notes |
|-----------|--------|-------|
| TTL field | ❌ Missing | public_events.expires_at not added |
| Housekeeping | ⚠️ Partial | TrackingService.cleanupOldEvents() uses created_at |
| Integration | ❌ Pending | Need to integrate with Feature 5 job system |

### Feature 6: Suggestion Bot

| Component | Status | Notes |
|-----------|--------|-------|
| Metrics dependency | ⚠️ Indirect | Uses TrackingService.getAnalytics() |
| Enums | ✅ Using | Marketplace enum |

---

## 10. Test Coverage

### Existing Tests

```bash
apps/api/tests/integration/feature-6-suggestions-bot.test.ts  ✅
apps/api/tests/integration/feature-5-time-infrastructure.test.ts  ✅
apps/api/tests/integration/milestone-2-dashboard-gerenciamento.test.ts  ✅
apps/api/tests/integration/milestone-1-public-marketplace.test.ts  ✅
```

### Missing Tests

1. Unit tests for tracking utilities
2. Unit tests for middlewares (bot-filter, visitor-id, dedupe)
3. Unit tests for consolidated services
4. Integration tests for Feature 7 specifically
5. E2E flow tests for tracking pipeline

---

## 11. Security & Privacy

### ✅ Privacy Measures Implemented

1. **IP Hashing**:
   - Function: `hashIP()` in tracking.util.ts
   - Algorithm: SHA-256(truncatedIP + userAgent + salt)
   - Truncation: IPv4 /24, IPv6 /64
   - Salt: `process.env.IP_HASH_SALT` (defaults to 'default-salt-change-me')

2. **User-Agent Sanitization**:
   - Max 160 characters
   - No PII patterns

3. **Referrer Sanitization**:
   - Removes sensitive params (token, api_key, password, etc.)
   - Max 200 characters

### ❌ Privacy Issues Found

1. **RefreshToken.ip_address**:
   - Line 132 in schema.prisma
   - Stores raw IP (VARCHAR 45)
   - **Violation**: GDPR/LGPD concern
   - **Fix**: Add `ip_hash` field, migrate data, deprecate `ip_address`

2. **LoginHistory.ipAddress**:
   - Line 160 in schema.prisma
   - Stores raw IP (VARCHAR 45)
   - **Same issue**: Should hash IPs

3. **Default Salt**:
   - Current: `'default-salt-change-me'`
   - **Risk**: Production must use strong random salt
   - **Action**: Enforce in .env.example, validate at startup

---

## 12. Duplicate Code

### Identified Duplicates

1. **Marketplace Enum Representation**:
   - `schema.prisma`: `enum Marketplace`
   - `marketplace_products.marketplace`: `String @db.VarChar(50)`
   - **Action**: Migrate marketplace_products to use enum

2. **Source Enum Representation**:
   - `schema.prisma`: `enum CardSource`
   - `marketplace_products.source`: `String @db.VarChar(20)`
   - **Action**: Migrate marketplace_products to use enum

3. **Tracking Logic**:
   - Partially in `TrackingService`
   - Partially in `PublicController`
   - **Action**: Consolidate in service layer

---

## Recommendations & Next Steps

### High Priority (Breaks Feature 7 Objectives)

1. **Add `public_events.expires_at` field**
   - Required for Feature 5 integration
   - Update schema, run migration
   - Backfill existing records

2. **Create Middleware Stack**
   - `bot-filter.middleware.ts`
   - `visitor-id.middleware.ts`
   - `dedupe.middleware.ts`
   - Apply to routes in correct order

3. **Fix Privacy Issues**
   - Hash IPs in RefreshToken and LoginHistory
   - Enforce IP_HASH_SALT in production

### Medium Priority (Improves Consistency)

4. **Consolidate Services**
   - Create `public-event.service.ts`
   - Create `metrics.service.ts`
   - Create `card.service.ts`

5. **Fix Enum Inconsistencies**
   - Migrate `marketplace_products.marketplace` to enum
   - Migrate `marketplace_products.source` to enum

6. **Create Validators**
   - `public-event.validator.ts`
   - `card.validator.ts`

### Low Priority (Nice-to-Have)

7. **Comprehensive Test Suite**
   - Unit tests for all new utilities
   - Integration tests for Feature 7
   - E2E tests for tracking flows

8. **Documentation**
   - Feature 7 documentation
   - API endpoint documentation
   - Architecture decision records

---

## File Checklist

| File | Status | Action |
|------|--------|--------|
| `schema.prisma` | ⚠️ Needs update | Add expires_at, fix enums |
| `tracking.util.ts` | ✅ Complete | No changes needed |
| `tracking.service.ts` | ⚠️ Needs refactor | Extract to middlewares |
| `rate-limit.middleware.ts` | ⚠️ Update limits | Match Feature 7 spec |
| `public.controller.ts` | ⚠️ Update | Use middleware stack |
| `public.routes.ts` | ⚠️ Update | Add middleware stack |
| `visitor-id.utils.ts` | ❌ Create | New file needed |
| `tracking-config.ts` | ❌ Create | New file needed |
| `bot-filter.middleware.ts` | ❌ Create | New file needed |
| `visitor-id.middleware.ts` | ❌ Create | New file needed |
| `dedupe.middleware.ts` | ❌ Create | New file needed |
| `public-event.service.ts` | ❌ Create | New file needed |
| `metrics.service.ts` | ❌ Create | New file needed |
| `card.service.ts` | ❌ Create | New file needed |

---

## Conclusion

**Audit Complete**: ✅

**Summary**:
- 60% of Feature 7 objectives already implemented
- Main gaps: Middleware architecture, visitor ID utilities, TTL field
- Privacy issues identified and fixable
- Code consolidation needed for maintainability

**Estimated Effort Remaining**: ~10-12 hours (down from 16h due to existing infrastructure)

**Next Task**: T002 - Create Consolidated Enums (if additional TypeScript exports needed)
