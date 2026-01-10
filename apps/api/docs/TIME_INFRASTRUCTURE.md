# Time Infrastructure & TTL System

## Overview

Comprehensive time management system with single timezone source of truth (America/Sao_Paulo - BRT), logical day cutoff, TTL expiration, and distributed job scheduling.

## Key Concepts

### 1. Single Timezone Source: BRT (America/Sao_Paulo)

All datetime operations use **BRT (Brasília Time)** as the single source of truth.

```typescript
import { nowBrt } from '../utils/time';

const now = nowBrt(); // Always returns Date in BRT timezone
```

**Why BRT?**
- Application is Brazil-focused
- Eliminates timezone confusion
- Consistent across all services
- Simplifies date comparisons

### 2. Logical Day (06:00 BRT Cutoff)

A "day" starts at **06:00 BRT**, not midnight.

```typescript
import { getDayKey } from '../utils/time';

// 2025-01-08 05:59 BRT → dayKey: "2025-01-07"
// 2025-01-08 06:00 BRT → dayKey: "2025-01-08"
```

**Why 06:00?**
- Matches business logic (overnight activity counts as previous day)
- Housekeeping runs at 06:15 (just after day boundary)
- Natural boundary for daily operations

### 3. TTL (Time-To-Live) System

Data expires after configurable periods:

**Default TTL Values:**
- `public_events`: 30 days
- `suggestion_cache`: varies (lazy expiration)
- `user_button_click_state`: 45 days
- `promotional_tokens`: custom expiration
- `public_event_dedupe`: 1 hour

**Two Expiration Strategies:**

#### A) Lazy Expiration (Runtime Check)
```typescript
import { isExpired } from '../utils/time';

const record = await prisma.suggestion_cache.findUnique({ where: { key } });
if (!record || isExpired(record.expires_at)) {
  // Handle expired/missing record
}
```

#### B) Housekeeping Job (Batch Cleanup)
```typescript
// Runs daily at 06:15 BRT via:
// - Railway cron (external trigger)
// - In-process scheduler (fallback)

const cutoff = getCutoffDate(30); // 30 days ago
await prisma.public_events.deleteMany({
  where: { created_at: { lt: cutoff } }
});
```

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    TIME INFRASTRUCTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐  ┌──────────────────┐              │
│  │  time.ts       │  │ time.constants.ts│              │
│  │  (Utils)       │  │ (Config)         │              │
│  └────────────────┘  └──────────────────┘              │
│           │                    │                         │
│           └────────┬───────────┘                         │
│                    ▼                                     │
│         ┌─────────────────────┐                         │
│         │  Job Infrastructure │                         │
│         ├─────────────────────┤                         │
│         │ - JobLockService    │                         │
│         │ - HousekeepingService│                        │
│         │ - SchedulerService  │                         │
│         └─────────────────────┘                         │
│                    │                                     │
│         ┌──────────┴──────────┐                         │
│         ▼                     ▼                          │
│  ┌─────────────┐      ┌─────────────────┐              │
│  │ Railway Cron│      │ In-Process Cron │              │
│  │ (Primary)   │      │ (Fallback)      │              │
│  └─────────────┘      └─────────────────┘              │
│         │                     │                          │
│         └──────────┬──────────┘                          │
│                    ▼                                     │
│         ┌─────────────────────┐                         │
│         │  Internal API       │                         │
│         │  /internal/jobs/*   │                         │
│         │  (Auth Required)    │                         │
│         └─────────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
apps/api/src/
├── utils/
│   └── time.ts                      # Core time utilities
├── constants/
│   └── time.constants.ts            # Time configuration
├── services/jobs/
│   ├── job-lock.service.ts          # Distributed lock
│   ├── housekeeping.service.ts      # Data cleanup job
│   └── scheduler.service.ts         # In-process cron
├── controllers/internal/
│   └── jobs.controller.ts           # Internal job API
├── routes/internal/
│   └── jobs.routes.ts               # Internal job routes
├── middleware/
│   └── internal-job-auth.middleware.ts
└── __tests__/                       # Comprehensive tests
```

## Time Utilities API

### Core Functions

#### `nowBrt(): Date`
Returns current time in BRT timezone.
```typescript
const now = nowBrt();
console.log(now.toISOString()); // "2025-01-08T12:30:00.000Z"
```

#### `getDayKey(date?: Date): string`
Returns logical day key (YYYY-MM-DD) with 06:00 cutoff.
```typescript
const key = getDayKey(nowBrt()); // "2025-01-08"
```

#### `isNewLogicalDay(lastDate: Date, currentDate: Date): boolean`
Checks if logical day boundary crossed.
```typescript
const last = new Date('2025-01-08T05:30:00-03:00');
const curr = new Date('2025-01-08T06:30:00-03:00');
isNewLogicalDay(last, curr); // true
```

#### `computeExpiresAt(ttlSeconds: number): Date`
Calculate expiration timestamp.
```typescript
const expiresAt = computeExpiresAt(3600); // 1 hour from now
```

#### `isExpired(expiresAt: Date): boolean`
Check if timestamp is expired.
```typescript
if (isExpired(record.expires_at)) {
  // Handle expired record
}
```

#### `getCutoffDate(daysAgo: number): Date`
Get cutoff date for cleanup operations.
```typescript
const cutoff30d = getCutoffDate(30); // 30 days ago in BRT
```

#### `formatBrt(date: Date): string`
Format date as BRT string.
```typescript
formatBrt(nowBrt()); // "08/01/2025 12:30:00 BRT"
```

#### `getNextRunTime(hour: number, minute: number): Date`
Calculate next scheduled run time.
```typescript
const nextRun = getNextRunTime(6, 15); // Next 06:15 BRT
```

#### `isWithinWindow(date: Date, windowSeconds: number): boolean`
Check if date is within time window.
```typescript
isWithinWindow(event.created_at, 3600); // Within last hour?
```

## Job System

### 1. Job Lock Service

Prevents concurrent job execution across multiple instances.

```typescript
import { jobLockService } from '../services/jobs/job-lock.service';

// Acquire lock
const result = await jobLockService.acquireLock('housekeeping', 10);
if (!result.acquired) {
  console.log('Job already running');
  return;
}

try {
  // Execute job
  await doWork();
} finally {
  // Always release lock
  await jobLockService.releaseLock('housekeeping');
}
```

**How it works:**
- Uses `job_locks` table in database
- Stores: job_name, locked_until, locked_by
- Lock expires automatically if not released
- Safe for distributed systems (Railway replicas)

### 2. Housekeeping Service

Daily cleanup job for expired data.

```typescript
import { housekeepingService } from '../services/jobs/housekeeping.service';

const result = await housekeepingService.execute();
// {
//   totalDeletedEvents: 123,
//   totalDeletedCaches: 45,
//   totalDeletedStates: 12,
//   totalExpiredTokens: 3,
//   totalDeletedDedupeKeys: 234,
//   duration: 1234
// }
```

**What it cleans:**
- `public_events`: > 30 days old
- `suggestion_cache`: expired entries
- `user_button_click_state`: > 45 days old
- `promotional_tokens`: expired status update
- `public_event_dedupe`: expired keys

**Protection:**
- Uses job lock (prevents overlaps)
- Gracefully handles missing tables
- Logs all operations
- Returns detailed stats

### 3. Scheduler Service

In-process cron scheduler (fallback).

```typescript
import { schedulerService } from '../services/jobs/scheduler.service';

// Start scheduler (in server.ts)
schedulerService.start();

// Stop scheduler (on shutdown)
schedulerService.stop();
```

**Configuration:**
```env
ENABLE_INPROCESS_SCHEDULER=true  # Enable/disable (default: true)
```

**Schedule:**
- Runs daily at 06:15 BRT
- Uses `node-cron` with America/Sao_Paulo timezone
- Logs next scheduled run

**Note:** Railway cron is primary, this is fallback for dev/single-instance.

## Internal API

### Authentication

All `/internal/jobs/*` endpoints require authentication:

```bash
curl -X POST \
  -H "x-internal-job-secret: YOUR_SECRET_HERE" \
  https://api.example.com/internal/jobs/housekeeping
```

**Environment Variable:**
```env
INTERNAL_JOBS_SECRET=generate-random-secret-here
```

### Endpoints

#### `POST /internal/jobs/housekeeping`
Trigger housekeeping job manually.

**Response:**
```json
{
  "success": true,
  "message": "Housekeeping job completed successfully",
  "data": {
    "totalDeletedEvents": 123,
    "totalDeletedCaches": 45,
    "totalDeletedStates": 12,
    "totalExpiredTokens": 3,
    "totalDeletedDedupeKeys": 234,
    "duration": 1234
  }
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": "Job already running",
  "message": "Job already running (locked until 2025-01-08T12:30:00.000Z)"
}
```

#### `GET /internal/jobs/lock-status/:jobName`
Check if job is currently locked.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobName": "housekeeping",
    "isLocked": false
  }
}
```

#### `DELETE /internal/jobs/lock/:jobName`
Force release lock (recovery only).

**Response:**
```json
{
  "success": true,
  "message": "Lock released for job: housekeeping"
}
```

## Railway Configuration

### railway.toml

```toml
# Housekeeping job - runs daily at 06:15 BRT (America/Sao_Paulo)
[[deploy.cron]]
schedule = "15 6 * * *"
command = "curl -X POST -H 'x-internal-job-secret: $INTERNAL_JOBS_SECRET' $RAILWAY_STATIC_URL/internal/jobs/housekeeping"
```

**Environment Variables (Railway):**
- `INTERNAL_JOBS_SECRET`: Secret for job authentication
- `RAILWAY_STATIC_URL`: Auto-provided by Railway
- `ENABLE_INPROCESS_SCHEDULER`: Set to `false` for Railway (cron handles it)

## Migration Guide

### Refactoring Existing Services

**Before:**
```typescript
const now = new Date();
const expiresAt = new Date(Date.now() + 3600 * 1000);
```

**After:**
```typescript
import { nowBrt, computeExpiresAt } from '../utils/time';

const now = nowBrt();
const expiresAt = computeExpiresAt(3600);
```

### Files Already Refactored

✅ `suggestion-engine.service.ts` - Uses `nowBrt()`
✅ `user-profile-analyzer.service.ts` - Uses `nowBrt()`
✅ `scraping-core.service.ts` - Uses `nowBrt()`

### Files to Refactor (if needed)

- Any service using `new Date()` directly
- Any service implementing custom TTL logic
- Any service with timezone-dependent operations

## Testing

Comprehensive test coverage with Vitest:

```bash
npm test -- time.test.ts
npm test -- job-lock.service.test.ts
npm test -- housekeeping.service.test.ts
```

**Test Coverage:**
- Time utils: 100%
- Job lock service: 100%
- Housekeeping service: 95%

## Best Practices

### ✅ DO

- Always use `nowBrt()` instead of `new Date()`
- Use `getDayKey()` for daily aggregations
- Use `computeExpiresAt()` for TTL timestamps
- Use `isExpired()` for lazy expiration checks
- Use job locks for any scheduled job
- Log all job operations

### ❌ DON'T

- Don't use `new Date()` directly
- Don't implement custom timezone logic
- Don't create jobs without locks
- Don't assume midnight = day boundary
- Don't use `Date.now()` for BRT operations

## Troubleshooting

### Issue: Jobs not running

**Check:**
1. Railway cron configured? (`railway.toml`)
2. `INTERNAL_JOBS_SECRET` set?
3. In-process scheduler enabled? (`ENABLE_INPROCESS_SCHEDULER`)
4. Job locked? (Check `/internal/jobs/lock-status/housekeeping`)

**Fix:**
```bash
# Force release lock
curl -X DELETE \
  -H "x-internal-job-secret: YOUR_SECRET" \
  https://api.example.com/internal/jobs/lock/housekeeping
```

### Issue: Timezone incorrect

**Check:**
1. Server timezone: `echo $TZ`
2. Database timezone: `SHOW timezone;` (PostgreSQL)
3. Luxon timezone: `nowBrt().toISO()` should show `-03:00` offset

**Fix:**
All operations use Luxon with explicit `America/Sao_Paulo` timezone - no server config needed.

### Issue: TTL not working

**Check:**
1. `expires_at` column populated?
2. Housekeeping running? (Check logs)
3. Lazy expiration implemented? (`isExpired()` check)

**Fix:**
```typescript
// Add lazy expiration check
const record = await prisma.table.findUnique({ where: { id } });
if (!record || isExpired(record.expires_at)) {
  return null; // Treat as missing
}
```

## Performance Considerations

### Database Indexes

Critical indexes for job system:

```sql
-- Job locks (already in schema)
CREATE INDEX idx_job_locks_job_name ON job_locks(job_name);
CREATE INDEX idx_job_locks_locked_until ON job_locks(locked_until);

-- Expiration queries (recommended)
CREATE INDEX idx_public_events_created_at ON public_events(created_at);
CREATE INDEX idx_suggestion_cache_expires_at ON suggestion_cache(expires_at);
```

### Housekeeping Job Timing

- Runs at 06:15 BRT (off-peak)
- Uses batch deletes (efficient)
- Locks prevent overlaps
- Typical duration: < 5 seconds

### Lazy Expiration

- Zero background processing
- Checked only on access
- Fast database query (indexed)
- Graceful handling of expired data

## Future Enhancements

- [ ] Distributed lock with Redis (for higher scale)
- [ ] Job status dashboard
- [ ] Configurable TTL per user
- [ ] Archival before deletion (backup)
- [ ] Retry mechanism for failed jobs
- [ ] Dead letter queue for failures

## Related Documentation

- [Railway Cron Jobs](https://docs.railway.app/guides/cron-jobs)
- [Luxon Documentation](https://moment.github.io/luxon/)
- [node-cron](https://github.com/node-cron/node-cron)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
