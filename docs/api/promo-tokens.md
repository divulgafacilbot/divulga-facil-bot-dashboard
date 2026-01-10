# Promo Tokens API Documentation

## Overview

The Promo Tokens API allows administrators to create, manage, and validate promotional tokens for the 4 bot types (ARTS, DOWNLOAD, PINTEREST, SUGGESTION).

All endpoints require authentication via JWT token and the `PROMO_TOKENS` permission.

Base URL: `/api/admin/promo-tokens`

---

## Endpoints

### 1. Create Promotional Token

**POST** `/api/admin/promo-tokens`

Creates a new promotional token with a securely generated 64-character hex string.

**Authentication:** Required (Admin with `PROMO_TOKENS` permission)

**Request Body:**
```json
{
  "botType": "ARTS | DOWNLOAD | PINTEREST | SUGGESTION",
  "name": "string (1-100 chars)",
  "description": "string (optional, max 5000 chars)",
  "expiresAt": "ISO 8601 datetime string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "botType": "ARTS",
    "name": "Token Promocional Lançamento",
    "description": "Token para promoção de lançamento",
    "token": "64-character hex string",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "isActive": true,
    "createdById": "admin-uuid",
    "createdAt": "2026-01-08T10:00:00.000Z",
    "updatedAt": "2026-01-08T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - No auth token
- `403 Forbidden` - Missing `PROMO_TOKENS` permission
- `500 Internal Server Error` - Server error

**Example cURL:**
```bash
curl -X POST https://api.example.com/api/admin/promo-tokens \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "botType": "ARTS",
    "name": "Token Promocional Lançamento",
    "description": "Token para promoção de lançamento",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }'
```

---

### 2. List Promotional Tokens

**GET** `/api/admin/promo-tokens`

Retrieves a paginated list of promotional tokens with optional filters.

**Authentication:** Required (Admin with `PROMO_TOKENS` permission)

**Query Parameters:**
- `botType` (optional): Filter by bot type (`ARTS`, `DOWNLOAD`, `PINTEREST`, `SUGGESTION`)
- `isActive` (optional): Filter by active status (`true` or `false`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [/* array of PromoToken objects */],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Example cURL:**
```bash
curl -X GET "https://api.example.com/api/admin/promo-tokens?botType=ARTS&isActive=true&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Token by ID

**GET** `/api/admin/promo-tokens/:id`

Retrieves a single promotional token by its UUID.

**Authentication:** Required (Admin with `PROMO_TOKENS` permission)

**Path Parameters:**
- `id` (required): Token UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {/* PromoToken object */}
}
```

**Error Responses:**
- `404 Not Found` - Token not found

---

### 4. Update Promotional Token

**PATCH** `/api/admin/promo-tokens/:id`

Updates a promotional token's metadata (name, description, expiresAt). Cannot update token string or bot type.

**Authentication:** Required (Admin with `PROMO_TOKENS` permission)

**Path Parameters:**
- `id` (required): Token UUID

**Request Body:**
```json
{
  "name": "string (optional, 1-100 chars)",
  "description": "string (optional, max 5000 chars)",
  "expiresAt": "ISO 8601 datetime string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {/* Updated PromoToken object */}
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed or no fields provided
- `404 Not Found` - Token not found

---

### 5. Delete Promotional Token

**DELETE** `/api/admin/promo-tokens/:id`

Soft deletes a promotional token by setting `isActive = false`. The token will no longer be valid for bot consumption.

**Authentication:** Required (Admin with `PROMO_TOKENS` permission)

**Path Parameters:**
- `id` (required): Token UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Token not found

---

### 6. Rotate Promotional Token

**POST** `/api/admin/promo-tokens/:id/rotate`

Creates a new token with the same properties as the old one, and immediately deactivates the old token. This operation is atomic.

**Authentication:** Required (Admin with `PROMO_TOKENS` permission)

**Path Parameters:**
- `id` (required): Token UUID to rotate

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {/* New PromoToken object with new token string */},
  "message": "Token rotated successfully"
}
```

**Error Responses:**
- `404 Not Found` - Token not found

---

## Token Validation (Bot Consumption)

Tokens are validated when bots attempt to use them. The validation checks:

1. Token exists in database
2. Token is active (`isActive = true`)
3. Token has not expired (`expiresAt` is null OR > now())
4. Token `botType` matches the requesting bot

Validation events are logged in telemetry for audit purposes.

---

## Audit Trail

All administrative actions on promotional tokens log telemetry events:

- `TOKEN_CREATED` - When a token is created
- `TOKEN_ROTATED` - When a token is rotated (includes old and new token IDs)
- `TOKEN_DELETED` - When a token is deleted
- `TOKEN_VALIDATED` - When a bot attempts to validate a token (success or failure)

---

## Rate Limiting

Currently no rate limiting is enforced on admin endpoints. Future versions may implement rate limiting for security.

---

## Security Considerations

- Tokens are generated using `crypto.randomBytes(32).toString('hex')` for cryptographic strength
- Expiration is enforced at validation time, not just creation time
- Rotation invalidates the old token immediately using a database transaction
- All actions require `PROMO_TOKENS` permission
- Token strings should be treated as secrets and transmitted securely
