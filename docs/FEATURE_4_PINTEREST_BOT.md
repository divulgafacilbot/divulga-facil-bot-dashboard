# Feature 4: Pinterest Bot & Suggestions System

Complete guide for the Pinterest Bot and AI-powered Suggestions System.

## Overview

Feature 4 introduces two major capabilities:

1. **Pinterest Bot**: Telegram bot for creating Pinterest-style product cards (9:16 format)
2. **Suggestions System**: AI-powered product recommendation engine

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├──────────────┬──────────────┬───────────────────────────┤
│ Marketplace  │ Suggestions  │ Preferences               │
│ Products     │ Page         │ Page                      │
└──────┬───────┴──────┬───────┴────────┬──────────────────┘
       │              │                 │
       ├──────────────┴─────────────────┤
       │        API Client Layer         │
       └────────────────┬────────────────┘
                        │
┌───────────────────────┴────────────────────────────────┐
│                    Backend API                          │
├──────────────┬──────────────┬──────────────────────────┤
│ Marketplace  │ Suggestions  │ Bots                     │
│ Service      │ Engine       │ (Pinterest, Arts)        │
└──────┬───────┴──────┬───────┴────────┬─────────────────┘
       │              │                 │
       └──────────────┴─────────────────┘
                      │
       ┌──────────────┴──────────────┐
       │   Database (PostgreSQL)      │
       │   - marketplace_products     │
       │   - suggestion_history       │
       │   - user_preferences         │
       └──────────────────────────────┘
```

## Database Schema

### marketplace_products

Stores affiliate products for marketplace promotion.

```sql
CREATE TABLE marketplace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL, -- 'BOT' | 'MANUAL'
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount_percent INTEGER,
  category VARCHAR(100),
  affiliate_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  marketplace VARCHAR(100) NOT NULL,
  coupon_code VARCHAR(100),
  custom_note TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false, -- Soft delete
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### suggestion_history

Tracks AI-generated product suggestions.

```sql
CREATE TABLE suggestion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_title VARCHAR(500) NOT NULL,
  suggested_product_url TEXT NOT NULL,
  suggested_price DECIMAL(10,2),
  suggested_original_price DECIMAL(10,2),
  suggested_discount_percent INTEGER,
  suggested_category VARCHAR(100),
  suggested_marketplace VARCHAR(100) NOT NULL,
  suggested_image_url TEXT,
  score DECIMAL(3,2), -- Relevance score 0-1
  user_action VARCHAR(50), -- 'ACCEPTED' | 'REJECTED' | 'IGNORED' | NULL
  actioned_at TIMESTAMP,
  suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_suggestion_preferences

User preferences for suggestion generation.

```sql
CREATE TABLE user_suggestion_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  suggestions_enabled BOOLEAN DEFAULT true,
  frequency VARCHAR(50) DEFAULT 'DAILY', -- 'DAILY' | 'WEEKLY' | 'MONTHLY'
  max_suggestions_per_batch INTEGER DEFAULT 5,
  preferred_categories TEXT[], -- Array of category names
  excluded_marketplaces TEXT[], -- Array of marketplace names
  last_suggestion_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Pinterest Bot

### Features

- Creates 9:16 Pinterest-style product cards
- Supports multiple marketplaces (Shopee, Amazon, Mercado Livre, etc.)
- Automatic category inference using AI
- Image download and processing
- Unique slug generation per marketplace
- Telegram integration via grammY

### Bot Commands

- `/start` - Start the bot and show welcome message
- `/criar` - Create a new product card
- `/produtos` - List user's products
- `/ajuda` - Show help and instructions

### Product Card Creation Flow

1. User initiates `/criar` command
2. Bot requests product URL
3. Bot scrapes product details (title, price, images)
4. Bot infers category using keywords + OpenAI
5. Bot downloads and processes product image
6. Bot generates unique slug
7. Bot creates marketplace product record
8. Bot sends confirmation to user

### Slug Format

Each marketplace has a unique prefix:

- Shopee: `sp-{11chars}` (e.g., `sp-abc123def45`)
- Amazon: `az-{11chars}`
- Mercado Livre: `ml-{11chars}`
- AliExpress: `ae-{11chars}`
- Magalu: `mg-{11chars}`
- Americanas: `am-{11chars}`
- Shein: `sh-{11chars}`

### Category Inference

**Step 1: Keyword Matching**

Checks product title against predefined keywords:

- Eletrônicos: smartphone, notebook, tablet, fone, carregador, etc.
- Moda: roupa, vestido, camisa, calça, sapato, etc.
- Beleza: maquiagem, perfume, creme, shampoo, etc.
- (and more...)

**Step 2: OpenAI Fallback**

If no keyword match, uses OpenAI to classify:

```typescript
const prompt = `Categorize o produto "${title}" em uma das categorias: ${categories.join(', ')}`;
const category = await openai.chat.completions.create({ ... });
```

### Image Processing

1. Download image from product URL
2. Resize to 800x800 pixels
3. Convert to JPEG format
4. Optimize quality (85%)
5. Store in `/uploads` directory
6. Return public URL

## Suggestions System

### How It Works

#### 1. User Profile Analysis

Analyzes user's existing products to build preference profile:

```typescript
{
  preferredCategories: ['Eletrônicos', 'Moda'],
  preferredMarketplaces: ['SHOPEE', 'AMAZON'],
  avgPriceRange: { min: 50, max: 500 },
  topKeywords: ['smartphone', 'fone', 'carregador']
}
```

#### 2. Product Recommendation

Fetches recommendations from SerpAPI:

```typescript
const results = await serpapi.search({
  engine: 'google_shopping',
  q: `${keywords} ${category}`,
  location: 'Brazil',
  gl: 'br',
  hl: 'pt'
});
```

#### 3. Relevance Scoring

Calculates score (0-1) based on:

- **Category Match (40%)**: Does category match preferences?
- **Price Match (30%)**: Is price in user's typical range?
- **Marketplace Match (20%)**: Is marketplace preferred?
- **Keyword Match (10%)**: Do keywords align with user's products?

```typescript
const score = (
  categoryScore * 0.4 +
  priceScore * 0.3 +
  marketplaceScore * 0.2 +
  keywordScore * 0.1
);
```

#### 4. User Actions

User can:
- **Accept**: Add to marketplace products
- **Reject**: Don't show again, negative signal
- **Ignore**: Neutral action

#### 5. Learning

System learns from user actions:
- Accepted suggestions boost similar recommendations
- Rejected suggestions filter out similar items
- Ignored suggestions don't affect future recommendations

### Preferences Configuration

Users can configure:

- **Enable/Disable**: Turn suggestions on/off
- **Frequency**: Daily, Weekly, Monthly
- **Max per Batch**: How many suggestions to generate (1-20)
- **Preferred Categories**: Which categories to focus on
- **Excluded Marketplaces**: Which marketplaces to avoid

## Frontend Pages

### Marketplace Products Page

**Route**: `/marketplace/products`

Features:
- Product grid with cards
- Stats dashboard (total, visible, featured, hidden)
- Create/Edit product form (modal)
- Pagination
- Featured/Hidden toggles

### Suggestions Page

**Route**: `/suggestions`

Features:
- Suggestion cards with accept/reject/ignore actions
- Filter by status (Pending, All, Accepted, Rejected, Ignored)
- Generate new suggestions button
- Pagination
- View product link (external)

### Preferences Page

**Route**: `/suggestions/preferences`

Features:
- Enable/disable suggestions toggle
- Frequency selector (Daily/Weekly/Monthly)
- Max suggestions slider (1-20)
- Category multi-select
- Marketplace exclusion multi-select
- Save button

## API Endpoints

### Marketplace

- `POST /api/marketplace/products` - Create product
- `GET /api/marketplace/products` - List products
- `GET /api/marketplace/products/:id` - Get product
- `PUT /api/marketplace/products/:id` - Update product
- `DELETE /api/marketplace/products/:id` - Delete product (soft)
- `GET /api/marketplace/stats` - Get statistics
- `POST /api/marketplace/products/:id/view` - Track view
- `POST /api/marketplace/products/:id/click` - Track click

### Suggestions

- `POST /api/suggestions/generate` - Generate suggestions
- `GET /api/suggestions` - List suggestions
- `POST /api/suggestions/:id/action` - Record action
- `GET /api/suggestions/preferences` - Get preferences
- `PUT /api/suggestions/preferences` - Update preferences

See detailed API documentation:
- [Marketplace API](../apps/api/docs/MARKETPLACE_API.md)
- [Suggestions API](../apps/api/docs/SUGGESTIONS_API.md)

## Services

### Backend Services

- **slug-generator.service.ts**: Generates unique slugs with marketplace prefixes
- **category-inference.service.ts**: Infers product categories using keywords + AI
- **image.service.ts**: Downloads, processes, and stores product images
- **product.service.ts**: CRUD operations for marketplace products
- **user-profile-analyzer.service.ts**: Analyzes user's product preferences
- **product-recommendation.service.ts**: Fetches recommendations from SerpAPI
- **suggestion-engine.service.ts**: Main orchestrator for suggestions system

### Shared Services

- **scraping-core.service.ts**: Core web scraping functionality (shared with Arts bot)
- **art-generation-core.service.ts**: Core art generation functionality
- **telegram-utils.ts**: Telegram utility functions

## Testing

### Unit Tests

- `product.service.test.ts` - Marketplace product service tests
- `suggestion-engine.service.test.ts` - Suggestions engine tests

### Integration Tests

- `marketplace.controller.test.ts` - Marketplace API tests
- `suggestions.controller.test.ts` - Suggestions API tests

### Run Tests

```bash
cd apps/api
npm test
```

## Environment Variables

```env
# SerpAPI for product recommendations
SERPAPI_KEY=your_serpapi_key_here

# OpenAI for category inference
OPENAI_API_KEY=your_openai_key_here

# Telegram Bot Token (Pinterest Bot)
PINTEREST_BOT_TOKEN=your_telegram_bot_token_here
```

## Deployment

### Database Migration

```bash
cd apps/api
npx prisma db push
```

### Start Services

```bash
# Start backend API
cd apps/api
npm run dev

# Start frontend
cd apps/web
npm run dev
```

### Bot Registration

Bots are automatically registered in `server.ts`:

```typescript
import { pinterestBot } from './bots/pinterest-bot';
import { artsBot } from './bots/arts-bot';

// Register bots
pinterestBot.start();
artsBot.start();
```

## Usage Examples

### Create Product via Pinterest Bot

1. Open Telegram bot
2. Send `/criar`
3. Send product URL (e.g., Shopee link)
4. Bot creates product and responds with confirmation

### Generate Suggestions

1. Go to `/suggestions/preferences`
2. Enable suggestions and configure preferences
3. Click "Generate Suggestions" button
4. View and interact with suggestions on `/suggestions`

### Manage Products

1. Go to `/marketplace/products`
2. View all products in grid
3. Click "Edit" to update product
4. Toggle featured/hidden status
5. View stats dashboard

## Future Enhancements

- Automated suggestion generation via cron job
- Pinterest card image generation (9:16 format)
- Product performance analytics
- A/B testing for product cards
- Integration with public storefront page
- Bulk product import
- Product templates
- Social sharing features

## Support

For issues or questions, contact the development team or refer to:
- [Marketplace API Documentation](../apps/api/docs/MARKETPLACE_API.md)
- [Suggestions API Documentation](../apps/api/docs/SUGGESTIONS_API.md)
