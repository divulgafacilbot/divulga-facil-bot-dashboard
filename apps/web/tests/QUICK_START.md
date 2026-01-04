# Quick Start Guide - E2E Tests

## Installation

```bash
cd apps/web
npm install
npx playwright install
```

## Configuration

1. Create test database:

```bash
createdb divulga_facil_test
```

2. Copy environment file:

```bash
cp .env.test .env.test.local
```

3. Update `.env.test.local` with your database credentials

## Running Tests

### All tests

```bash
npm run test:e2e
```

### Specific test file

```bash
npx playwright test campaigns.spec.ts
```

### With UI (interactive mode)

```bash
npm run test:e2e:ui
```

### Debug mode

```bash
npm run test:e2e:debug
```

### Watch mode

```bash
npx playwright test --watch
```

## Test Files

```
tests/
├── e2e/
│   ├── campaigns.spec.ts                    # Main test suite
│   ├── campaigns-with-page-objects.spec.ts  # Tests with page objects
│   ├── helpers/
│   │   └── test-helpers.ts                  # Shared utilities
│   └── page-objects/
│       ├── AdminCampaignsPage.ts            # Admin page object
│       ├── CreateCampaignModal.ts           # Modal page object
│       └── UserPromotionalPage.ts           # User page object
├── fixtures/
│   └── test-image.jpg                       # Test fixtures
└── README.md                                # Full documentation
```

## Writing New Tests

### Basic test structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin, createTestAdmin } from './helpers/test-helpers';

test('my new test', async ({ page }) => {
  const admin = await createTestAdmin();
  await loginAsAdmin(page, admin);

  // Your test code here
});
```

### Using page objects

```typescript
import { AdminCampaignsPage } from './page-objects/AdminCampaignsPage';

test('test with page object', async ({ page }) => {
  const adminPage = new AdminCampaignsPage(page);
  await adminPage.goto();
  await adminPage.openCreateModal();
  // ...
});
```

## Common Commands

```bash
# Run specific test
npx playwright test -g "admin can create campaign"

# Run in headed mode
npm run test:e2e:headed

# Generate code
npx playwright codegen localhost:3000

# View last report
npm run test:e2e:report

# Update snapshots
npx playwright test --update-snapshots
```

## Troubleshooting

### Port already in use

```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### Database locked

```bash
psql divulga_facil_test -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'divulga_facil_test';"
```

### Clear test data

```bash
psql divulga_facil_test -c "TRUNCATE campaigns, campaign_assets, campaign_downloads CASCADE;"
```

## Tips

1. Use `page.pause()` to debug tests interactively
2. Check `test-results/` for failure screenshots
3. Use `--workers=1` for debugging race conditions
4. Add `test.only()` to run single test
5. Use `test.skip()` to temporarily disable tests

## Next Steps

1. Read full documentation: `tests/README.md`
2. Check CI workflow: `.github/workflows/e2e-tests.yml`
3. Review page objects for reusable patterns
4. Add custom fixtures for your use case
