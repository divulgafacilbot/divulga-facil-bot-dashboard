# Feature 6: Intelligent Suggestions Bot

## Overview

The Intelligent Suggestions Bot is a Telegram bot that answers "What should I post today?" with AI-powered product suggestions based on real metrics data. It provides 5 product recommendations per marketplace (Mercado Livre, Shopee, Amazon, Magazine Luiza) using online research via Perplexity API.

## Key Features

- **Smart Caching**: 30-day TTL cache system with lazy expiration
- **Double-Click Refresh**: Users can force cache renewal by clicking the same marketplace button on consecutive logical days
- **AI-Powered Suggestions**: Uses Perplexity API with constrained search based on historical metrics
- **Promotional Campaigns**: Admin can inject promotional products (replaces 5th suggestion with 5-day cooldown)
- **Metrics-Driven Context**: Analyzes last 30 days of metrics to understand what works best

## Architecture

### Database Schema

#### `suggestion_cache`
- Stores 30-day cached suggestions for all 4 marketplaces
- Includes `input_context` (metrics analysis snapshot)
- Uses lazy expiration via `expires_at` timestamp

#### `user_button_click_state`
- Tracks user clicks for double-click detection
- Uses `last_click_day_key` (YYYY-MM-DD format in BRT timezone)

#### `promotional_campaigns`
- Admin-managed campaigns for each marketplace
- Fields: `name`, `product_title`, `product_url`, `category`, `marketplace`, `hook_angle`, `is_active`, `priority`

#### `campaign_rotation_state`
- Tracks last used campaign per marketplace
- Implements 5-day cooldown to avoid repetition

## Core Services

### 1. Suggestion Cache Service
**Location**: `src/services/suggestions/suggestion-cache.service.ts`

**Methods**:
- `getCache()`: Returns cached suggestions if valid (checks `expires_at`)
- `saveCache(suggestions, inputContext)`: Saves all 4 marketplaces at once
- `invalidateCache()`: Deletes cache (forces regeneration)
- `detectDoubleClick(userId, marketplace)`: Checks if user clicked same marketplace next logical day
- `recordClick(userId, marketplace)`: Tracks clicks for double-click detection

**Time Utilities** (from Feature 5):
- `nowBrt()`: Current time in BRT timezone
- `getDayKey(date)`: Returns `YYYY-MM-DD` format
- `computeExpiresAt(seconds)`: Calculates expiration timestamp
- `isExpired(timestamp)`: Checks if timestamp is in the past

### 2. Metrics Analyzer Service
**Location**: `src/services/suggestions/metrics-analyzer.service.ts`

**Purpose**: Analyzes last 30 days of metrics to build `InputContext`

**Analyzes**:
- Dominant personas (top 3 with share %)
- Dominant categories (top 4 with share %)
- Secondary categories (for diversity)
- Avoid categories (CTR < 2%)
- Top CTR patterns (>5% CTR)
- Product patterns (kits, combos, etc.)
- Marketplace distributions
- Target price bands per marketplace

**Returns**: `InputContext` object with all insights

### 3. Campaign Injector Service
**Location**: `src/services/suggestions/campaign-injector.service.ts`

**Purpose**: Inject promotional campaigns into suggestions

**Logic**:
1. For each marketplace, find eligible campaign:
   - `is_active = true`
   - Marketplace matches
   - Not used in last 5 days (check `campaign_rotation_state`)
   - Order by `priority DESC`, `created_at ASC`
2. Replace suggestion at index 4 (the 5th product)
3. Update `campaign_rotation_state` with current day key

**Cooldown**: 5 days (configurable via `CAMPAIGN_COOLDOWN_DAYS`)

### 4. JSON Validator Service
**Location**: `src/services/suggestions/json-validator.service.ts`

**Purpose**: Validate and repair AI-generated JSON

**Validation Rules**:
- All 4 marketplaces present
- Each marketplace has exactly 5 products
- Each product has: `title`, `url`, `hook_angle`, `category`, `estimated_price`
- Categories must be from allowed list
- URLs must match marketplace domain

**Repair Mode**:
- Attempts to fix malformed JSON
- Fills missing suggestions with placeholders
- Returns repaired data or null if unrepairable

### 5. Perplexity Client Service
**Location**: `src/services/suggestions/perplexity-client.service.ts`

**Purpose**: Call Perplexity API with retry logic

**Configuration**:
- Model: `llama-3.1-sonar-large-128k-online`
- Temperature: 0.3
- Max tokens: 4000

**Features**:
- Retry with exponential backoff (max 3 attempts)
- Error handling and logging

### 6. Telegram Suggestion Orchestrator Service
**Location**: `src/services/suggestions/telegram-suggestion-orchestrator.service.ts`

**Purpose**: Main orchestrator that ties everything together

**Flow**:
1. Check cache (`suggestionCacheService.getCache()`)
2. If valid cache exists:
   - Inject campaigns (`campaignInjectorService.injectCampaigns()`)
   - Return suggestions
3. If no cache:
   - Analyze metrics (`metricsAnalyzerService.analyzeMetrics()`)
   - Generate suggestions via Perplexity AI
   - Validate and repair if needed (max 3 attempts)
   - Inject campaigns
   - Save to cache
   - Return suggestions

**AI Prompt Structure**:
- System prompt: Defines task, rules, and JSON format
- User prompt: Includes `InputContext` insights (personas, categories, patterns, price bands)

## Telegram Bot

### Bot Configuration
**Token**: `TELEGRAM_BOT_SUGESTION_TOKEN` (environment variable)

**Location**: `src/bot/suggestion-bot.ts`

### Commands

#### `/start`
Shows inline keyboard with 4 marketplace buttons:
- Mercado Livre
- Shopee
- Amazon
- Magazine Luiza (Magalu)

### Callback Handlers

#### Marketplace Selection (`marketplace:*`)
1. Check double-click: If same user + same marketplace + next logical day → invalidate cache
2. Get suggestions via `telegramSuggestionOrchestratorService.getSuggestions()`
3. Filter to marketplace-specific suggestions
4. Format response with products (title, hook angle, URL)
5. Record click for double-click detection

**Response Format**:
```
🔥 Hoje vale mais a pena divulgar esses 5 produtos no mercado livre:

1. **Product Title**
   • Gancho: "hook angle"
   • https://product-url

2. **Product Title**
   • Gancho: "hook angle"
   • https://product-url

...

Quer que eu gere artes de algum item?
```

## Admin API

### Base Path
`/api/admin/promotional-campaigns`

### Endpoints

#### `GET /api/admin/promotional-campaigns`
List all promotional campaigns

**Query Parameters**:
- `marketplace`: Filter by marketplace (optional)
- `is_active`: Filter by active status (optional)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**:
```json
{
  "campaigns": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### `GET /api/admin/promotional-campaigns/:id`
Get a single campaign by ID

#### `POST /api/admin/promotional-campaigns`
Create a new promotional campaign

**Body**:
```json
{
  "name": "Campaign Name",
  "product_title": "Product Title",
  "product_url": "https://...",
  "category": "Eletrônicos",
  "marketplace": "MERCADO_LIVRE",
  "hook_angle": "economia",
  "is_active": true,
  "priority": 10
}
```

#### `PUT /api/admin/promotional-campaigns/:id`
Update a campaign

#### `DELETE /api/admin/promotional-campaigns/:id`
Delete a campaign

#### `POST /api/admin/promotional-campaigns/:id/toggle`
Toggle campaign active status

#### `GET /api/admin/promotional-campaigns/rotation/:marketplace`
Get rotation state for a marketplace

#### `POST /api/admin/promotional-campaigns/cache/invalidate`
Invalidate suggestion cache (force regeneration)

## Configuration

### Environment Variables

Required:
- `TELEGRAM_BOT_SUGESTION_TOKEN`: Telegram bot token for suggestions bot
- `PERPLEXITY_API_KEY`: Perplexity API key for AI suggestions

Optional:
- `DATABASE_URL`: PostgreSQL connection string

### Constants

**Location**: `src/constants/suggestions.constants.ts`

```typescript
export const SUGGESTION_CONSTANTS = {
  MARKETPLACES: ['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU'],
  CACHE_TTL_DAYS: 30,
  SUGGESTIONS_PER_MARKETPLACE: 5,
  METRICS_WINDOW_DAYS: 30,
  ALLOWED_CATEGORIES: [
    'Eletrônicos', 'Moda', 'Casa', 'Beleza', 'Esporte',
    'Livros', 'Brinquedos', 'Alimentos', 'Ferramentas',
    'Automotivo', 'Pet', 'Jardim', 'Outros'
  ],
  TARGET_PRICE_BANDS: {
    MERCADO_LIVRE: ['R$ 20–80', 'R$ 80–200', 'R$ 200–500'],
    SHOPEE: ['R$ 10–50', 'R$ 50–150', 'R$ 150–300'],
    AMAZON: ['R$ 50–150', 'R$ 150–400', 'R$ 400–1000'],
    MAGALU: ['R$ 30–100', 'R$ 100–300', 'R$ 300–700']
  },
  DOMINANT_CATEGORIES_COUNT: 4,
  SECONDARY_CATEGORIES_COUNT: 1,
  CAMPAIGN_COOLDOWN_DAYS: 5,
  CAMPAIGN_SUBSTITUTION_INDEX: 4
};
```

## Usage Examples

### 1. User Flow - Normal Usage

1. User opens Telegram bot
2. User sends `/start`
3. Bot shows 4 marketplace buttons
4. User clicks "Mercado Livre"
5. Bot checks cache:
   - If valid → returns cached suggestions + injects campaign
   - If expired → generates new suggestions → saves to cache → injects campaign → returns
6. Bot shows 5 products with titles, hook angles, and URLs

### 2. User Flow - Double-Click Refresh

1. User clicks "Mercado Livre" on Day 1 → Gets suggestions (cached for 30 days)
2. User clicks "Mercado Livre" again on Day 2 → Double-click detected:
   - Cache invalidated
   - New suggestions generated
   - Cache saved with new 30-day TTL
3. User gets fresh suggestions

### 3. Admin Flow - Create Campaign

1. Admin logs into admin panel
2. Navigate to `/admin/promotional-campaigns`
3. Click "Create Campaign"
4. Fill form:
   - Name: "Black Friday Fone JBL"
   - Product Title: "Fone de Ouvido JBL Tune 510BT"
   - Product URL: "https://www.amazon.com.br/..."
   - Category: "Eletrônicos"
   - Marketplace: "AMAZON"
   - Hook Angle: "economia"
   - Priority: 10
5. Save campaign
6. Next time suggestions are generated for Amazon, the 5th product will be this campaign
7. Campaign won't repeat for 5 days

### 4. Admin Flow - Force Cache Refresh

1. Admin wants to test new campaign immediately
2. Navigate to `/admin/promotional-campaigns`
3. Click "Invalidate Cache"
4. Next user request will generate fresh suggestions with the new campaign

## Error Handling

### Cache Miss
- If cache is empty, generate new suggestions
- If AI generation fails, show error message to user

### AI Generation Failure
- Retry up to 3 times with exponential backoff
- If validation fails, attempt to repair JSON
- If repair fails, use placeholder suggestions

### Double-Click Detection
- If database query fails, treat as first click (safe default)

### Campaign Injection
- If no eligible campaigns, keep AI-generated suggestion at index 4
- If campaign query fails, log error and continue without injection

## Testing

### Manual Testing

1. **Test Cache**:
   ```bash
   # First request (cache miss)
   curl -X POST http://localhost:4000/api/suggestions/test

   # Second request (cache hit)
   curl -X POST http://localhost:4000/api/suggestions/test
   ```

2. **Test Double-Click**:
   - Click marketplace on Day 1
   - Change system date to Day 2
   - Click same marketplace
   - Verify cache invalidation

3. **Test Campaign Injection**:
   - Create active campaign via admin API
   - Generate suggestions
   - Verify 5th product is the campaign
   - Generate again within 5 days
   - Verify different campaign or same if only one exists

### Integration Testing

See `src/services/suggestions/__tests__/` for unit tests (to be implemented in T023-T026)

## Deployment Checklist

- [ ] Set `TELEGRAM_BOT_SUGESTION_TOKEN` environment variable
- [ ] Set `PERPLEXITY_API_KEY` environment variable
- [ ] Run database migrations (`npx prisma db push`)
- [ ] Verify bot starts successfully (check logs for "✅ Suggestion Bot started")
- [ ] Test `/start` command in Telegram
- [ ] Test marketplace button clicks
- [ ] Create at least one promotional campaign per marketplace
- [ ] Verify campaign injection works
- [ ] Monitor Perplexity API usage and costs

## Troubleshooting

### Bot Not Starting

**Symptom**: Error message "TELEGRAM_BOT_SUGESTION_TOKEN not configured"

**Solution**: Set environment variable in `.env` file:
```
TELEGRAM_BOT_SUGESTION_TOKEN=your_bot_token_here
```

### AI Generation Fails

**Symptom**: Error "PERPLEXITY_API_KEY not configured"

**Solution**: Set environment variable in `.env` file:
```
PERPLEXITY_API_KEY=your_api_key_here
```

### Cache Never Expires

**Symptom**: Suggestions never refresh even after 30 days

**Solution**: Check `expires_at` timestamps in database:
```sql
SELECT cache_key, expires_at, created_at FROM suggestion_cache;
```

Verify timezone configuration (should use BRT/America/Sao_Paulo)

### Double-Click Not Working

**Symptom**: Clicking marketplace twice doesn't refresh suggestions

**Solution**: Check `user_button_click_state` table:
```sql
SELECT * FROM user_button_click_state WHERE user_id = 'USER_ID';
```

Verify `last_click_day_key` is being updated correctly (format: YYYY-MM-DD)

### Campaign Not Appearing

**Symptom**: Created campaign but not showing in suggestions

**Possible Causes**:
1. Campaign `is_active = false` → Set to `true`
2. Campaign used recently → Wait for cooldown to expire (5 days)
3. Cache not refreshed → Invalidate cache via admin API
4. Wrong marketplace → Verify marketplace field matches user selection

## Future Enhancements

- [ ] Add webhook support for real-time updates
- [ ] Implement A/B testing for different prompts
- [ ] Add analytics for campaign performance
- [ ] Support for custom categories per user
- [ ] Multi-language support
- [ ] Integration with affiliate link generation
- [ ] Automated campaign performance reports

## Related Features

- **Feature 5**: Time Infrastructure & TTL (provides time utilities)
- **Feature 3**: Dashboard Admin (provides admin panel for campaigns)
- **Feature 4**: Suggestions System (complementary user-facing suggestions)

## Support

For issues or questions:
1. Check logs for error messages
2. Verify environment variables are set
3. Check database connectivity
4. Review Perplexity API quotas and limits
5. Contact development team if issues persist
