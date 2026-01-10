# Marketplace API Documentation

API endpoints for managing marketplace affiliate products.

## Base URL

```
/api/marketplace
```

## Authentication

All endpoints require authentication via JWT token in cookie or Authorization header.

## Endpoints

### Create Product

**POST** `/products`

Create a new marketplace product.

**Request Body:**

```json
{
  "source": "MANUAL",
  "title": "Smartphone XYZ 128GB",
  "description": "Smartphone com 128GB de armazenamento",
  "price": 899.90,
  "originalPrice": 1299.90,
  "discountPercent": 30,
  "category": "Eletrônicos",
  "affiliateUrl": "https://shopee.com.br/affiliate/xyz",
  "imageUrl": "https://example.com/image.jpg",
  "marketplace": "SHOPEE",
  "couponCode": "DESC30",
  "customNote": "Melhor preço da semana!",
  "isFeatured": false
}
```

**Response:**

```json
{
  "product": {
    "id": "uuid",
    "user_id": "uuid",
    "source": "MANUAL",
    "title": "Smartphone XYZ 128GB",
    "slug": "sp-abc123def45",
    "description": "Smartphone com 128GB de armazenamento",
    "price": 899.90,
    "original_price": 1299.90,
    "discount_percent": 30,
    "category": "Eletrônicos",
    "affiliate_url": "https://shopee.com.br/affiliate/xyz",
    "image_url": "https://example.com/image.jpg",
    "marketplace": "SHOPEE",
    "coupon_code": "DESC30",
    "custom_note": "Melhor preço da semana!",
    "is_featured": false,
    "is_hidden": false,
    "views_count": 0,
    "clicks_count": 0,
    "created_at": "2025-01-08T12:00:00Z",
    "updated_at": "2025-01-08T12:00:00Z"
  }
}
```

### List Products

**GET** `/products`

List user's marketplace products with pagination and filters.

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `category` (string, optional) - Filter by category
- `marketplace` (string, optional) - Filter by marketplace
- `isFeatured` (boolean, optional) - Filter by featured status
- `isHidden` (boolean, optional) - Filter by hidden status

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Product Title",
      ...
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Get Product

**GET** `/products/:id`

Get a single product by ID.

**Response:**

```json
{
  "product": {
    "id": "uuid",
    "title": "Product Title",
    ...
  }
}
```

### Update Product

**PUT** `/products/:id`

Update an existing product.

**Request Body:**

```json
{
  "title": "Updated Title",
  "price": 799.90,
  "isFeatured": true,
  "isHidden": false
}
```

**Response:**

```json
{
  "product": {
    "id": "uuid",
    "title": "Updated Title",
    ...
  }
}
```

### Delete Product

**DELETE** `/products/:id`

Soft delete a product (sets `is_hidden` to true).

**Response:**

```json
{
  "message": "Produto excluído com sucesso"
}
```

### Get Product Stats

**GET** `/stats`

Get product statistics for the authenticated user.

**Response:**

```json
{
  "total": 100,
  "visible": 85,
  "featured": 15,
  "hidden": 15
}
```

### Track View

**POST** `/products/:id/view`

Track a product view (increments view counter).

**Response:**

```json
{
  "message": "View registrada"
}
```

### Track Click

**POST** `/products/:id/click`

Track a product click (increments click counter).

**Response:**

```json
{
  "message": "Click registrado"
}
```

## Product Source Types

- `BOT` - Product created automatically by Pinterest bot
- `MANUAL` - Product created manually by user

## Marketplaces

- `SHOPEE`
- `AMAZON`
- `MERCADO_LIVRE`
- `ALIEXPRESS`
- `MAGALU`
- `AMERICANAS`
- `SHEIN`

## Categories

- Eletrônicos
- Moda
- Beleza
- Casa e Decoração
- Esporte e Lazer
- Alimentos e Bebidas
- Livros
- Brinquedos
- Pet
- Automotivo
- Outros

## Slug Format

Products are automatically assigned a unique slug in the format:

```
{marketplace_prefix}-{11_random_chars}
```

Examples:
- Shopee: `sp-abc123def45`
- Amazon: `az-xyz789ghi01`
- Mercado Livre: `ml-qwe456rty78`

## Error Responses

All endpoints may return these error formats:

**400 Bad Request:**

```json
{
  "error": "Validation error message"
}
```

**401 Unauthorized:**

```json
{
  "error": "Authentication required"
}
```

**404 Not Found:**

```json
{
  "error": "Produto não encontrado"
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal server error"
}
```
