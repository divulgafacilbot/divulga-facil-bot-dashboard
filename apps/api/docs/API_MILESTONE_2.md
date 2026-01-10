# API Documentation - Milestone 2: Dashboard de Gerenciamento

## Overview

This document describes all API endpoints added in Milestone 2, including:
- Telegram bot linking endpoints
- Pinterest/Public page settings
- Manual card CRUD operations
- Analytics and metrics endpoints

**Base URL**: `http://localhost:4000` (development)
**Authentication**: JWT token via HTTP-only cookie
**Content-Type**: `application/json` (except file uploads: `multipart/form-data`)

---

## Authentication

All endpoints require authentication unless otherwise noted.

**Headers**:
```
Cookie: token=<JWT_TOKEN>
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions

---

## Telegram Bot Linking

### POST /api/telegram/generate-link

Generate a temporary token for linking a Telegram bot to user account.

**Authentication**: Required

**Request Body**:
```json
{
  "botType": "ARTS" | "DOWNLOAD" | "PINTEREST" | "SUGGESTION"
}
```

**Success Response (200 OK)**:
```json
{
  "link": {
    "token": "ABCD123456",
    "botType": "ARTS",
    "botName": "Bot de Artes",
    "telegramHandle": "@DivulgaFacilArtesBot",
    "instructions": "Envie /codigo ABCD123456 no bot para vincular",
    "expiresAt": "2026-01-08T15:30:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid bot type
- `500 Internal Server Error`: Failed to generate token

**Notes**:
- Token expires in 10 minutes
- Token is unique and can only be used once
- Each bot type has specific configuration (handle, name, instructions)

**Example**:
```bash
curl -X POST http://localhost:4000/api/telegram/generate-link \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"botType": "ARTS"}'
```

---

### GET /api/telegram/linked-bots

Get all bots linked to the authenticated user's account.

**Authentication**: Required

**Success Response (200 OK)**:
```json
{
  "bots": [
    {
      "id": "uuid",
      "botType": "ARTS",
      "telegramUserId": "123456789",
      "linkedAt": "2026-01-08T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "botType": "PINTEREST",
      "telegramUserId": "987654321",
      "linkedAt": "2026-01-08T12:00:00.000Z"
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:4000/api/telegram/linked-bots \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### GET /api/telegram/bot-configs

Get configuration for all available bots.

**Authentication**: Required

**Success Response (200 OK)**:
```json
{
  "configs": [
    {
      "botType": "ARTS",
      "name": "Bot de Artes",
      "telegramHandle": "@DivulgaFacilArtesBot",
      "description": "Geração automática de artes"
    },
    {
      "botType": "DOWNLOAD",
      "name": "Bot de Download",
      "telegramHandle": "@DivulgaFacilDownloadBot",
      "description": "Downloads de mídias sociais"
    },
    {
      "botType": "PINTEREST",
      "name": "Bot de Pinterest",
      "telegramHandle": "@DivulgaFacilPinterestBot",
      "description": "Criação automática de cards"
    },
    {
      "botType": "SUGGESTION",
      "name": "Bot de Sugestões",
      "telegramHandle": "@DivulgaFacilSugestaoBot",
      "description": "Sugestões personalizadas"
    }
  ]
}
```

---

## Pinterest / Public Page Settings

### GET /api/pinterest/settings

Get public page settings for authenticated user.

**Authentication**: Required

**Success Response (200 OK)**:
```json
{
  "settings": {
    "id": "uuid",
    "userId": "uuid",
    "publicSlug": "user-slug-abc123",
    "displayName": "My Store",
    "headerColor": "#FF006B",
    "bio": "Welcome to my store! Find amazing deals here.",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-08T12:00:00.000Z"
  }
}
```

**Example**:
```bash
curl http://localhost:4000/api/pinterest/settings \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### PATCH /api/pinterest/settings

Update public page settings.

**Authentication**: Required

**Request Body** (all fields optional):
```json
{
  "displayName": "New Store Name",
  "headerColor": "#00FF00",
  "bio": "Updated bio text"
}
```

**Validation**:
- `displayName`: String, max 100 characters
- `headerColor`: Valid hex color (#RRGGBB)
- `bio`: String, max 500 characters

**Success Response (200 OK)**:
```json
{
  "settings": {
    "id": "uuid",
    "userId": "uuid",
    "publicSlug": "user-slug-abc123",
    "displayName": "New Store Name",
    "headerColor": "#00FF00",
    "bio": "Updated bio text",
    "updatedAt": "2026-01-08T13:00:00.000Z"
  },
  "message": "Configurações atualizadas com sucesso"
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors (bio too long, invalid color, etc.)

**Example**:
```bash
curl -X PATCH http://localhost:4000/api/pinterest/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "displayName": "My Awesome Store",
    "headerColor": "#00FF00",
    "bio": "Find the best products here!"
  }'
```

---

## Manual Card CRUD

### POST /api/pinterest/cards

Create a new manual card with image upload.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `data` (JSON string):
  ```json
  {
    "title": "Product Name",
    "price": "R$ 99,90",
    "originalPrice": "R$ 149,90",
    "description": "Product description",
    "affiliateUrl": "https://example.com/product",
    "marketplace": "MERCADO_LIVRE" | "SHOPEE" | "AMAZON" | "MAGALU",
    "coupon": "SAVE10",
    "category": "Eletrônicos"
  }
  ```
- `image` (File): Image file (JPEG, PNG, or WEBP, max 5MB)

**Required Fields**: `title`, `price`, `affiliateUrl`, `image`

**Success Response (201 Created)**:
```json
{
  "card": {
    "id": "uuid",
    "userId": "uuid",
    "cardSlug": "abc123xyz-1234567890",
    "source": "MANUAL",
    "marketplace": "MERCADO_LIVRE",
    "title": "Product Name",
    "description": "Product description",
    "price": "R$ 99,90",
    "originalPrice": "R$ 149,90",
    "imageUrl": "/uploads/cards/xyz123-1234567890.webp",
    "affiliateUrl": "https://example.com/product",
    "coupon": "SAVE10",
    "category": "Eletrônicos",
    "status": "ACTIVE",
    "createdAt": "2026-01-08T14:00:00.000Z"
  },
  "message": "Card criado com sucesso"
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields or validation errors
- `413 Payload Too Large`: Image file exceeds 5MB

**Image Processing**:
- Images are resized to max 800x800px (maintaining aspect ratio)
- Converted to WebP format with 80% quality
- Stored in `/uploads/cards/` directory

**Example**:
```bash
curl -X POST http://localhost:4000/api/pinterest/cards \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -F 'data={"title":"Test Product","price":"R$ 99,90","affiliateUrl":"https://example.com/test"}' \
  -F 'image=@/path/to/image.jpg'
```

---

### GET /api/pinterest/cards

Get all cards for authenticated user.

**Authentication**: Required

**Query Parameters** (optional):
- `status`: Filter by status (`ACTIVE`, `HIDDEN`)
- `source`: Filter by source (`MANUAL`, `BOT`)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Success Response (200 OK)**:
```json
{
  "cards": [
    {
      "id": "uuid",
      "cardSlug": "abc123",
      "source": "MANUAL",
      "marketplace": "MERCADO_LIVRE",
      "title": "Product 1",
      "price": "R$ 99,90",
      "originalPrice": "R$ 149,90",
      "imageUrl": "/uploads/cards/image1.webp",
      "affiliateUrl": "https://example.com/1",
      "status": "ACTIVE",
      "createdAt": "2026-01-08T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "cardSlug": "def456",
      "source": "BOT",
      "marketplace": "SHOPEE",
      "title": "Product 2",
      "price": "R$ 49,90",
      "imageUrl": "/uploads/cards/image2.webp",
      "affiliateUrl": "https://example.com/2",
      "status": "ACTIVE",
      "createdAt": "2026-01-08T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**Example**:
```bash
curl "http://localhost:4000/api/pinterest/cards?status=ACTIVE&limit=10" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### PATCH /api/pinterest/cards/:id

Update a card. (Not fully implemented - use status endpoint for status changes)

**Authentication**: Required

**URL Parameters**:
- `id`: Card UUID

**Request Body**:
```json
{
  "title": "Updated Title",
  "price": "R$ 89,90",
  "description": "Updated description"
}
```

**Success Response (200 OK)**:
```json
{
  "card": {
    "id": "uuid",
    "title": "Updated Title",
    "price": "R$ 89,90",
    "updatedAt": "2026-01-08T15:00:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Card not found or doesn't belong to user

---

### PATCH /api/pinterest/cards/:id/status

Toggle card status between ACTIVE and HIDDEN.

**Authentication**: Required

**URL Parameters**:
- `id`: Card UUID

**Request Body**:
```json
{
  "status": "ACTIVE" | "HIDDEN"
}
```

**Success Response (200 OK)**:
```json
{
  "card": {
    "id": "uuid",
    "status": "HIDDEN",
    "updatedAt": "2026-01-08T15:30:00.000Z"
  },
  "message": "Status do card atualizado com sucesso"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid status value
- `404 Not Found`: Card not found

**Example**:
```bash
curl -X PATCH http://localhost:4000/api/pinterest/cards/CARD_UUID/status \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"status": "HIDDEN"}'
```

---

### DELETE /api/pinterest/cards/:id

Delete a card (hard delete).

**Authentication**: Required

**URL Parameters**:
- `id`: Card UUID

**Success Response (200 OK)**:
```json
{
  "message": "Card removido com sucesso"
}
```

**Error Responses**:
- `404 Not Found`: Card not found or doesn't belong to user

**Notes**:
- This is a hard delete (card is permanently removed)
- Associated image file is also deleted from storage

**Example**:
```bash
curl -X DELETE http://localhost:4000/api/pinterest/cards/CARD_UUID \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

## Analytics Endpoints

### GET /api/analytics/dashboard

Get dashboard metrics for authenticated user.

**Authentication**: Required

**Query Parameters**:
- `timeRange`: `7d` | `30d` | `all` (default: `30d`)

**Success Response (200 OK)**:
```json
{
  "timeRange": "30d",
  "publicPage": {
    "profileViews": 150,
    "cardViews": 450,
    "cardClicks": 75,
    "ctaClicks": 25,
    "ctr": 50.0,
    "totalCards": 20,
    "activeCards": 15
  }
}
```

**Metrics Explanation**:
- `profileViews`: Number of times public page was viewed
- `cardViews`: Total views of individual cards
- `cardClicks`: Clicks on affiliate links
- `ctaClicks`: Clicks on CTA buttons
- `ctr`: Click-through rate (clicks / views * 100)
- `totalCards`: Total number of cards
- `activeCards`: Number of cards with ACTIVE status

**Example**:
```bash
curl "http://localhost:4000/api/analytics/dashboard?timeRange=7d" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### GET /api/analytics/top-cards

Get top performing cards based on click count.

**Authentication**: Required

**Query Parameters**:
- `limit`: Number of results (default: 10, max: 50)
- `timeRange`: `7d` | `30d` | `all` (default: `30d`)

**Success Response (200 OK)**:
```json
{
  "cards": [
    {
      "id": "uuid",
      "title": "Best Selling Product",
      "price": "R$ 99,90",
      "imageUrl": "/uploads/cards/image1.webp",
      "affiliateUrl": "https://example.com/1",
      "clickCount": 50,
      "status": "ACTIVE"
    },
    {
      "id": "uuid",
      "title": "Popular Item",
      "price": "R$ 79,90",
      "imageUrl": "/uploads/cards/image2.webp",
      "affiliateUrl": "https://example.com/2",
      "clickCount": 30,
      "status": "ACTIVE"
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:4000/api/analytics/top-cards?limit=5" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### GET /api/analytics/visitors

Get visitor statistics.

**Authentication**: Required

**Query Parameters**:
- `timeRange`: `7d` | `30d` | `all` (default: `30d`)

**Success Response (200 OK)**:
```json
{
  "uniqueVisitors": 85,
  "totalVisits": 150,
  "timeRange": "30d"
}
```

**Metrics Explanation**:
- `uniqueVisitors`: Count of unique visitors (based on IP + User Agent)
- `totalVisits`: Total number of page visits

**Example**:
```bash
curl "http://localhost:4000/api/analytics/visitors?timeRange=7d" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### GET /api/analytics/time-series

Get time-series data for specific event types.

**Authentication**: Required

**Query Parameters**:
- `eventType`: Event type to query (required)
  - `PUBLIC_PROFILE_VIEW`
  - `PUBLIC_CARD_VIEW`
  - `PUBLIC_CARD_CLICK`
  - `PUBLIC_CTA_CLICK`
- `timeRange`: `7d` | `30d` | `all` (default: `30d`)

**Success Response (200 OK)**:
```json
{
  "data": [
    {
      "date": "2026-01-01",
      "count": 10
    },
    {
      "date": "2026-01-02",
      "count": 15
    },
    {
      "date": "2026-01-03",
      "count": 8
    }
  ],
  "eventType": "PUBLIC_PROFILE_VIEW",
  "timeRange": "7d"
}
```

**Example**:
```bash
curl "http://localhost:4000/api/analytics/time-series?eventType=PUBLIC_CARD_CLICK&timeRange=30d" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {} // Optional, for validation errors
}
```

**Common HTTP Status Codes**:
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File size exceeds limit
- `500 Internal Server Error`: Server error

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Authenticated users**: 100 requests per minute
- **File uploads**: 10 uploads per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641657600
```

---

## Data Models

### BotType Enum
```typescript
enum BotType {
  ARTS = "ARTS",
  DOWNLOAD = "DOWNLOAD",
  PINTEREST = "PINTEREST",
  SUGGESTION = "SUGGESTION"
}
```

### Marketplace Enum
```typescript
enum Marketplace {
  MERCADO_LIVRE = "MERCADO_LIVRE",
  SHOPEE = "SHOPEE",
  AMAZON = "AMAZON",
  MAGALU = "MAGALU"
}
```

### CardStatus Enum
```typescript
enum CardStatus {
  ACTIVE = "ACTIVE",
  HIDDEN = "HIDDEN"
}
```

### CardSource Enum
```typescript
enum CardSource {
  MANUAL = "MANUAL",
  BOT = "BOT"
}
```

---

## Change Log

### Version 2.0.0 (Milestone 2) - 2026-01-08

**Added**:
- Telegram bot linking endpoints for 4 bots
- Public page settings management
- Manual card CRUD with image upload
- Analytics dashboard endpoints
- Top cards analytics
- Visitor statistics
- Time-series analytics data

**Changed**:
- Expanded `BotType` enum to include PINTEREST and SUGGESTION
- Expanded `TicketCategory` enum for bot-specific support

**Database Changes**:
- Added `telegram_link_tokens` table
- Updated `telegram_bot_links` to use BotType enum
- Created `public_cards` table with image support

---

## Support

For API support or questions:
- Email: dev@divulgafacil.com
- Documentation: https://docs.divulgafacil.com
- GitHub Issues: https://github.com/divulgafacil/api/issues
