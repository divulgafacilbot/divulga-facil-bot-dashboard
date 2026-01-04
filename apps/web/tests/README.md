# E2E Tests for Promotional Campaigns

End-to-end tests for the promotional campaigns feature using Playwright.

## Setup

### Prerequisites

```bash
npm install -D @playwright/test
npx playwright install
```

### Environment Configuration

Copy `.env.test` and configure your test database:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3000
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/divulga_facil_test
```

### Database Setup

The tests will automatically run migrations on the test database. Ensure you have a separate test database configured.

## Running Tests

### Run all tests

```bash
npx playwright test
```

### Run specific test file

```bash
npx playwright test tests/e2e/campaigns.spec.ts
```

### Run with page objects

```bash
npx playwright test tests/e2e/campaigns-with-page-objects.spec.ts
```

### Run in UI mode

```bash
npx playwright test --ui
```

### Run in headed mode

```bash
npx playwright test --headed
```

### Run specific test by name

```bash
npx playwright test -g "admin can create new campaign"
```

### Debug tests

```bash
npx playwright test --debug
```

## Test Structure

### Test Files

- `campaigns.spec.ts` - Main test file with all test scenarios
- `campaigns-with-page-objects.spec.ts` - Tests using page object pattern

### Helper Files

- `helpers/test-helpers.ts` - Shared test utilities and helper functions
  - `createTestUser()` - Creates a test user account
  - `createTestAdmin()` - Creates a test admin account
  - `loginAsAdmin(page, admin)` - Logs in as admin
  - `loginAsUser(page, user)` - Logs in as user
  - `createTestCampaign(admin)` - Creates a test campaign via API
  - Cleanup functions for test data

### Page Objects

- `page-objects/AdminCampaignsPage.ts` - Admin campaigns page object
- `page-objects/CreateCampaignModal.ts` - Create campaign modal object
- `page-objects/UserPromotionalPage.ts` - User promotional page object

### Fixtures

- `fixtures/test-image.jpg` - Test image for campaign uploads

## Test Coverage

### Admin Flow

- Access campaigns page
- Create new campaign with files
- View campaign list
- Download campaign ZIP
- Delete campaign
- View updated stats after actions

### User Flow

- Access promotional page
- View available campaigns
- Download campaign materials
- Download tracking in database
- Empty state when no campaigns

### Full Flow

- Admin creates campaign
- User browses and downloads
- Admin sees download count increase
- Admin deletes campaign
- User no longer sees campaign
- Multiple users downloading same campaign

### Error Handling

- User cannot access admin pages
- Form validation prevents empty submission
- Downloading deleted campaign shows error

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run E2E Tests
  run: |
    npm install
    npx playwright install --with-deps
    npx playwright test
```

## Viewing Test Reports

After tests run:

```bash
npx playwright show-report
```

## Debugging Failed Tests

Tests automatically capture:
- Screenshots on failure
- Videos on failure
- Traces for retry attempts

Access these in `test-results/` directory.

## Best Practices

1. Tests run in isolated database environment
2. Test data is cleaned up after each test
3. Use page objects for better maintainability
4. Tests are independent and can run in any order
5. Proper wait strategies for async operations
6. Download verification for file operations

## Troubleshooting

### Tests timing out

Increase timeout in `playwright.config.ts`:

```typescript
use: {
  actionTimeout: 30000,
  navigationTimeout: 30000,
}
```

### Database connection issues

Ensure test database is running and accessible:

```bash
psql $TEST_DATABASE_URL -c "SELECT 1"
```

### File upload failures

Verify test fixtures exist:

```bash
ls -la tests/fixtures/
```

### Authentication issues

Check API endpoints are running:

```bash
curl http://localhost:4000/api/health
```
