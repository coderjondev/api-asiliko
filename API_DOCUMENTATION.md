# API Documentation - Asiliko AI Service

## Base URL
```
Development: http://localhost:5000
Production: https://api.asiliko.com
```

## Authentication

### 1. JWT Token (for users)
```bash
Authorization: Bearer <jwt_token>
```

### 2. API Key (for external apps)
```bash
X-API-Key: sk_xxxxxxxxxxxxx
# OR
Authorization: Bearer sk_xxxxxxxxxxxxx
```

---

## 📚 Endpoints

### Health & Status

#### `GET /`
Health check endpoint
```bash
curl http://localhost:5000/
```

**Response:**
```json
{
  "message": "AI Service API muvaffaqiyatli ishlayapti!",
  "version": "1.0.0",
  "status": "OK",
  "timestamp": "2026-08-19T12:53:00.000Z"
}
```

#### `GET /health`
Server health status
```bash
curl http://localhost:5000/health
```

---

## 🔐 Authentication Endpoints

### `POST /api/v1/auth/register`
Ro'yxatdan o'tish

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email to verify your account.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "tier": "free",
    "isEmailVerified": false
  }
}
```

### `POST /api/v1/auth/login`
Kirish

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "tier": "free",
    "isEmailVerified": true
  }
}
```

### `GET /api/v1/auth/verify-email?token=xxx`
Email tasdiqlash

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

### `POST /api/v1/auth/resend-verification`
Email tasdiqlashni qayta yuborish

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Verification email sent successfully"
}
```

### `POST /api/v1/auth/forgot-password`
Parolni unutish

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

### `POST /api/v1/auth/reset-password`
Parolni tiklash

**Request:**
```json
{
  "token": "reset_token_here",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

### `GET /api/v1/auth/profile`
Profil ma'lumotlari

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "tier": "free",
  "isEmailVerified": true,
  "usage": {
    "daily": 5,
    "monthly": 120,
    "lastReset": "2026-08-19T00:00:00.000Z"
  },
  "createdAt": "2026-08-01T10:00:00.000Z"
}
```

---

## 🔑 API Keys Management

### `POST /api/v1/users/api-keys`
API key yaratish

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "My App Key",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "message": "API key yaratildi",
  "apiKey": "sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "keyInfo": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My App Key",
    "prefix": "sk_a1b2",
    "expiresAt": "2027-08-19T12:53:00.000Z",
    "createdAt": "2026-08-19T12:53:00.000Z"
  },
  "warning": "Bu key faqat bir marta ko'rsatiladi. Xavfsiz saqlang!"
}
```

### `GET /api/v1/users/api-keys`
API keylar ro'yxati

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "keys": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "My App Key",
      "prefix": "sk_a1b2",
      "lastUsed": "2026-08-19T11:30:00.000Z",
      "createdAt": "2026-08-19T10:00:00.000Z",
      "expiresAt": "2027-08-19T10:00:00.000Z",
      "isActive": true
    }
  ]
}
```

### `DELETE /api/v1/users/api-keys/:keyId`
API key o'chirish

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "API key o'chirildi"
}
```

---

## 🤖 AI Chat Endpoints

### `POST /api/v1/ai/chat`
AI bilan suhbat

**Headers:** 
- `Authorization: Bearer <jwt_token>` OR
- `X-API-Key: sk_xxxxx`

**Request:**
```json
{
  "prompt": "TypeScript haqida qisqacha tushuntir",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

**Response:**
```json
{
  "response": "TypeScript - bu Microsoft tomonidan ishlab chiqilgan...",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "tokensUsed": {
    "input": 15,
    "output": 230,
    "total": 245
  },
  "usage": {
    "daily": 6,
    "dailyLimit": 20,
    "monthly": 121,
    "monthlyLimit": 1000
  }
}
```

### `GET /api/v1/ai/history`
Chat tarixi

**Headers:** `Authorization: Bearer <token>` or `X-API-Key: sk_xxx`

**Query params:**
- `page` - Sahifa raqami (default: 1)
- `limit` - Natijalar soni (default: 20)

**Response:**
```json
{
  "prompts": [
    {
      "id": "507f1f77bcf86cd799439011",
      "prompt": "TypeScript haqida qisqacha tushuntir",
      "response": "TypeScript - bu...",
      "provider": "deepseek",
      "model": "deepseek-chat",
      "tokensUsed": 245,
      "createdAt": "2026-08-19T12:30:00.000Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "total": 95
}
```

---

## 📁 File Upload Endpoints

### `POST /api/v1/files/upload`
Fayl yuklash

**Headers:** 
- `Authorization: Bearer <token>` or `X-API-Key: sk_xxx`
- `Content-Type: multipart/form-data`

**Request (multipart):**
```
file: [binary file]
```

**Response:**
```json
{
  "message": "Fayl muvaffaqiyatli yuklandi",
  "file": {
    "id": "507f1f77bcf86cd799439011",
    "filename": "document.pdf",
    "url": "https://bucket.s3.amazonaws.com/user123/1734612780-123456.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "uploadedAt": "2026-08-19T12:53:00.000Z"
  }
}
```

### `GET /api/v1/files`
Fayllar ro'yxati

**Headers:** `Authorization: Bearer <token>`

**Query params:**
- `page` - Sahifa raqami (default: 1)
- `limit` - Natijalar soni (default: 20)

**Response:**
```json
{
  "files": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "document.pdf",
      "url": "https://bucket.s3.amazonaws.com/...",
      "size": 1024000,
      "mimetype": "application/pdf",
      "uploadedAt": "2026-08-19T12:53:00.000Z"
    }
  ],
  "totalPages": 2,
  "currentPage": 1,
  "total": 25
}
```

### `DELETE /api/v1/files/:fileId`
Faylni o'chirish

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Fayl o'chirildi"
}
```

---

## 🔗 Webhook Endpoints

### `POST /api/v1/webhooks`
Webhook yaratish

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "My Webhook",
  "url": "https://myapp.com/webhook",
  "events": ["ai.chat.completed", "file.uploaded"],
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "My Webhook",
  "url": "https://myapp.com/webhook",
  "events": ["ai.chat.completed", "file.uploaded"],
  "secret": "whsec_a1b2c3d4e5f6...",
  "isActive": true,
  "createdAt": "2026-08-19T12:53:00.000Z"
}
```

### `GET /api/v1/webhooks`
Webhooklar ro'yxati

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "webhooks": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "My Webhook",
      "url": "https://myapp.com/webhook",
      "events": ["ai.chat.completed"],
      "isActive": true,
      "stats": {
        "totalCalls": 150,
        "successfulCalls": 148,
        "failedCalls": 2
      }
    }
  ],
  "totalPages": 1,
  "currentPage": 1,
  "total": 3
}
```

### `GET /api/v1/webhooks/:webhookId`
Webhook ma'lumotlari

**Headers:** `Authorization: Bearer <token>`

### `PUT /api/v1/webhooks/:webhookId`
Webhook tahrirlash

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Updated Webhook",
  "url": "https://myapp.com/new-webhook",
  "events": ["ai.chat.completed", "file.uploaded", "user.registered"],
  "isActive": true
}
```

### `DELETE /api/v1/webhooks/:webhookId`
Webhook o'chirish

**Headers:** `Authorization: Bearer <token>`

### `POST /api/v1/webhooks/:webhookId/regenerate-secret`
Secret yangilash

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "secret": "whsec_new_secret_here..."
}
```

### `POST /api/v1/webhooks/:webhookId/test`
Webhook test qilish

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Test webhook sent successfully"
}
```

### `GET /api/v1/webhooks/:webhookId/stats`
Webhook statistikasi

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "totalCalls": 150,
  "successfulCalls": 148,
  "failedCalls": 2,
  "lastCall": "2026-08-19T12:45:00.000Z",
  "averageResponseTime": 250
}
```

---

## 👨‍💼 Admin Endpoints

**Note:** Barcha admin endpointlar admin rolini talab qiladi.

### `GET /api/v1/admin/stats`
Tizim statistikasi

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "overview": {
    "totalUsers": 1520,
    "activeUsers": 1450,
    "totalRequests": 45230,
    "totalPrompts": 38900,
    "requests24h": 3420,
    "prompts24h": 2890
  },
  "providerUsage": [
    {
      "_id": "deepseek",
      "count": 25000,
      "totalTokens": 5000000
    },
    {
      "_id": "gemini",
      "count": 13900,
      "totalTokens": 3200000
    }
  ],
  "tierDistribution": [
    {
      "_id": "free",
      "count": 1400
    },
    {
      "_id": "pro",
      "count": 100
    },
    {
      "_id": "enterprise",
      "count": 20
    }
  ]
}
```

### `GET /api/v1/admin/users`
Foydalanuvchilar ro'yxati

**Headers:** `Authorization: Bearer <admin_token>`

**Query params:**
- `page` - Sahifa (default: 1)
- `limit` - Limit (default: 20)
- `tier` - Tier filter (free/pro/enterprise)
- `isActive` - Status filter (true/false)
- `search` - Email/name qidiruv

**Response:**
```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "tier": "free",
      "isActive": true,
      "usage": {
        "daily": 5,
        "monthly": 120
      },
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "totalPages": 76,
  "currentPage": 1,
  "total": 1520
}
```

### `PUT /api/v1/admin/users/:userId/tier`
User tier yangilash

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "tier": "pro"
}
```

**Response:**
```json
{
  "message": "User tier yangilandi",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "tier": "pro"
  }
}
```

### `POST /api/v1/admin/users/:userId/toggle`
User statusni o'zgartirish (activate/deactivate)

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "message": "User statusi o'zgartirildi",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "isActive": false
  }
}
```

### `GET /api/v1/admin/logs`
Request loglar

**Headers:** `Authorization: Bearer <admin_token>`

**Query params:**
- `page` - Sahifa (default: 1)
- `limit` - Limit (default: 50)
- `userId` - User ID filter
- `statusCode` - Status code filter
- `method` - HTTP method filter

**Response:**
```json
{
  "logs": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "method": "POST",
      "path": "/api/v1/ai/chat",
      "statusCode": 200,
      "responseTime": 1250,
      "ip": "192.168.1.1",
      "provider": "deepseek",
      "tokensUsed": 245,
      "timestamp": "2026-08-19T12:30:00.000Z"
    }
  ],
  "totalPages": 150,
  "currentPage": 1,
  "total": 7500
}
```

### `GET /api/v1/admin/ai/config`
AI konfiguratsiyasini olish

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "deepseek": {
    "apiKey": "sk-***",
    "model": "deepseek-chat",
    "maxTokens": 4096,
    "isEnabled": true
  },
  "gemini": {
    "apiKey": "AIza***",
    "model": "gemini-pro",
    "maxTokens": 4096,
    "isEnabled": true
  },
  "defaultProvider": "deepseek"
}
```

### `PUT /api/v1/admin/ai/config`
AI konfiguratsiyasini yangilash

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "deepseek": {
    "apiKey": "sk-new-key",
    "model": "deepseek-chat",
    "maxTokens": 8192
  }
}
```

### `POST /api/v1/admin/ai/default-provider`
Default provider o'rnatish

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**
```json
{
  "provider": "gemini"
}
```

---

## 📊 User Tiers

| Tier | Kunlik Limit | Oylik Limit | Max Tokens | API Keys | Narx |
|------|-------------|-------------|------------|----------|------|
| Free | 20 | 1000 | 2048 | 2 | Bepul |
| Pro | 100 | 5000 | 8192 | 5 | $19/oy |
| Enterprise | ∞ | ∞ | 16384 | 10 | $99/oy |

---

## 🔒 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global | 100 requests | 15 min |
| AI Chat | 5 requests | 1 min |
| Auth (login/register) | 5 requests | 15 min |

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details (only in development)"
}
```

---

## 🎯 Webhook Events

Available webhook events:

- `ai.chat.completed` - AI chat tugallandi
- `ai.chat.failed` - AI chat xatolik bilan tugadi
- `user.registered` - Yangi user ro'yxatdan o'tdi
- `user.verified` - User emailni tasdiqladi
- `file.uploaded` - Fayl yuklandi
- `file.deleted` - Fayl o'chirildi
- `api.key.created` - API key yaratildi
- `api.key.deleted` - API key o'chirildi
- `webhook.test` - Test webhook

### Webhook Payload Format
```json
{
  "event": "ai.chat.completed",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "prompt": "Hello AI",
    "response": "Hello! How can I help you?",
    "provider": "deepseek",
    "tokensUsed": 25
  },
  "timestamp": "2026-08-19T12:53:00.000Z",
  "webhookId": "507f1f77bcf86cd799439012"
}
```

### Webhook Signature Verification
Webhook secret bilan signature yarating:
```javascript
const crypto = require('crypto');

const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Request headerda: X-Webhook-Signature
```

---

## 🚀 Quick Start

### 1. Register
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Create API Key
```bash
curl -X POST http://localhost:5000/api/v1/users/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "expiresInDays": 365
  }'
```

### 4. Chat with AI
```bash
curl -X POST http://localhost:5000/api/v1/ai/chat \
  -H "X-API-Key: sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello AI!",
    "provider": "deepseek"
  }'
```

---

## 📝 Notes

- Barcha date/time qiymatlari ISO 8601 formatida (UTC)
- Pagination har doim `page`, `limit`, `totalPages`, `total` qaytaradi
- API keylar `sk_` prefixi bilan boshlanadi
- Webhook secretlar `whsec_` prefixi bilan boshlanadi
- Rate limit headers har requestda qaytariladi:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
