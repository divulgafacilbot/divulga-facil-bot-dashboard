# Suggestions API Documentation

API endpoints for AI-powered product suggestions system.

## Base URL

```
/api/suggestions
```

## Authentication

All endpoints require authentication via JWT token in cookie or Authorization header.

## Endpoints

### Generate Suggestions

**POST** `/generate`

Generate new product suggestions based on user preferences and profile.

**Response:**

```json
{
  "generatedCount": 5,
  "message": "5 sugestões geradas com sucesso"
}
```

**Notes:**
- Uses user's suggestion preferences (categories, marketplaces, frequency)
- Analyzes user's existing products to build preference profile
- Fetches recommendations from SerpAPI
- Calculates relevance scores for each suggestion
- Requires suggestions to be enabled in preferences

### List Suggestions

**GET** `/`

List user's product suggestions with pagination and filters.

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `actionFilter` (string, optional) - Filter by action status
  - `PENDING` - Not yet acted upon
  - `ACCEPTED` - User accepted
  - `REJECTED` - User rejected
  - `IGNORED` - User ignored

**Response:**

```json
{
  "suggestions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "suggested_title": "Smartphone ABC 256GB",
      "suggested_product_url": "https://shopee.com.br/product/xyz",
      "suggested_price": 1299.90,
      "suggested_original_price": 1899.90,
      "suggested_discount_percent": 32,
      "suggested_category": "Eletrônicos",
      "suggested_marketplace": "SHOPEE",
      "suggested_image_url": "https://example.com/image.jpg",
      "score": 0.95,
      "user_action": null,
      "actioned_at": null,
      "suggested_at": "2025-01-08T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Record User Action

**POST** `/:id/action`

Record user's action on a suggestion (accept, reject, or ignore).

**Request Body:**

```json
{
  "action": "ACCEPTED"
}
```

**Valid Actions:**
- `ACCEPTED` - User accepts and wants to use this product
- `REJECTED` - User rejects this product
- `IGNORED` - User ignores this product

**Response:**

```json
{
  "suggestion": {
    "id": "uuid",
    "user_action": "ACCEPTED",
    "actioned_at": "2025-01-08T12:30:00Z",
    ...
  }
}
```

### Get Preferences

**GET** `/preferences`

Get user's suggestion preferences.

**Response:**

```json
{
  "user_id": "uuid",
  "suggestions_enabled": true,
  "frequency": "DAILY",
  "max_suggestions_per_batch": 5,
  "preferred_categories": [
    "Eletrônicos",
    "Moda",
    "Beleza"
  ],
  "excluded_marketplaces": [
    "ALIEXPRESS"
  ],
  "last_suggestion_at": "2025-01-08T10:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-08T10:00:00Z"
}
```

### Update Preferences

**PUT** `/preferences`

Update user's suggestion preferences.

**Request Body:**

```json
{
  "suggestionsEnabled": true,
  "frequency": "WEEKLY",
  "maxSuggestionsPerBatch": 10,
  "preferredCategories": [
    "Eletrônicos",
    "Casa e Decoração"
  ],
  "excludedMarketplaces": [
    "ALIEXPRESS",
    "SHEIN"
  ]
}
```

**Response:**

```json
{
  "user_id": "uuid",
  "suggestions_enabled": true,
  "frequency": "WEEKLY",
  "max_suggestions_per_batch": 10,
  "preferred_categories": [
    "Eletrônicos",
    "Casa e Decoração"
  ],
  "excluded_marketplaces": [
    "ALIEXPRESS",
    "SHEIN"
  ],
  "updated_at": "2025-01-08T12:00:00Z"
}
```

## Frequency Types

- `DAILY` - Generate suggestions daily
- `WEEKLY` - Generate suggestions weekly
- `MONTHLY` - Generate suggestions monthly

## User Actions

- `ACCEPTED` - User accepts the suggestion
- `REJECTED` - User rejects the suggestion
- `IGNORED` - User ignores the suggestion

## Suggestion Flow

1. User configures preferences (categories, marketplaces, frequency)
2. System analyzes user's existing products to build preference profile
3. System fetches product recommendations from SerpAPI
4. System calculates relevance scores based on:
   - Category match
   - Price range match
   - Marketplace preference
   - Keyword relevance
5. User receives suggestions sorted by relevance score
6. User can accept, reject, or ignore each suggestion
7. System learns from user actions for future suggestions

## Relevance Score

Score ranges from 0 to 1, calculated based on:

- **Category Match** (0.4 weight): Does the category match user preferences?
- **Price Range Match** (0.3 weight): Is the price within user's typical range?
- **Marketplace Match** (0.2 weight): Is it from a preferred marketplace?
- **Keyword Match** (0.1 weight): Do keywords match user's products?

## Error Responses

**400 Bad Request:**

```json
{
  "error": "Validation error message"
}
```

**403 Forbidden:**

```json
{
  "error": "Sugestões desabilitadas para este usuário"
}
```

**404 Not Found:**

```json
{
  "error": "Sugestão não encontrada"
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal server error"
}
```

## Integration with Pinterest Bot

When the Pinterest bot creates a product card, it can:
1. Check for pending suggestions
2. Auto-populate product fields from suggestion data
3. Mark suggestion as "ACCEPTED"
4. Link the created product to the original suggestion
