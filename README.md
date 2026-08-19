# AI Service API - To'liq Hujjat

![Status](https://img.shields.io/badge/status-production-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

AI va Admin panel integratsiyasiga ega to'liq Express.js backend xizmati.

## ✨ Yangi Qo'shilgan Funksiyalar

### ✅ API Key System
- Foydalanuvchilar o'z API keylarini yaratishi mumkin
- Tier-based limitlar (free: 2, pro: 5, enterprise: 10)
- SHA-256 hash bilan xavfsiz saqlash
- Muddati tugaydigan keylar
- Usage tracking

### ✅ Advanced Rate Limiting
- Global rate limiting (100 req/15min)
- AI-specific rate limiting (5 req/min)
- Auth endpoint protection (5 req/15min)
- Redis yoki memory-based fallback

### ✅ Request Logging & Analytics
- Barcha so'rovlar loglanadi
- User, IP, response time tracking
- AI provider va token usage tracking
- Admin dashboard uchun analytics

### ✅ Admin Dashboard Endpoints
- Tizim statistikasi
- User management (tier, status)
- Request logs ko'rish
- AI provider usage analytics

### ✅ Automated Scheduler
- Kunlik usage reset (har kuni 00:00)
- Oylik usage reset (har oyning 1-kuni)
- Production mode-da avtomatik ishga tushadi

## 🚀 Server holati

✅ **Server muvaffaqiyatli ishlayapti!**
- Port: 5000
- URL: http://localhost:5000
- Environment: Production
- Status: Healthy

⚠️ **MongoDB:** Atlas'da IP whitelist sozlash kerak
- [MongoDB Atlas Security](https://www.mongodb.com/docs/atlas/security-whitelist/)
- IP manzilni qo'shgandan keyin barcha funksiyalar ishlaydi

## 📚 API Endpoints

### Health Check
```bash
GET /                 # API status
GET /health          # Server health
```

### 👤 User Management

#### Ro'yxatdan o'tish
```bash
POST /api/v1/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Kirish
```bash
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### Profil
```bash
GET /api/v1/users/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

### 🔑 API Keys

#### API Key Yaratish
```bash
POST /api/v1/users/api-keys
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "My App Key",
  "expiresInDays": 365
}

# Response:
{
  "message": "API key yaratildi",
  "apiKey": "sk_a1b2c3d4e5f6g7h8...",
  "keyInfo": {
    "id": "...",
    "name": "My App Key",
    "prefix": "sk_a1b2",
    "expiresAt": "2027-08-19T...",
    "createdAt": "2026-08-19T..."
  },
  "warning": "Bu key faqat bir marta ko'rsatiladi. Xavfsiz saqlang!"
}
```

#### API Keylar Ro'yxati
```bash
GET /api/v1/users/api-keys
Authorization: Bearer YOUR_JWT_TOKEN
```

#### API Key O'chirish
```bash
DELETE /api/v1/users/api-keys/:keyId
Authorization: Bearer YOUR_JWT_TOKEN
```

### 🤖 AI Chat

#### Chat (JWT yoki API Key)
```bash
POST /api/v1/ai/chat
Authorization: Bearer YOUR_JWT_TOKEN
# yoki
X-API-Key: sk_your_api_key
Content-Type: application/json

{
  "prompt": "Salom! TypeScript haqida qisqacha tushuntir",
  "provider": "deepseek",  // yoki "gemini"
  "model": "deepseek-chat"
}

# Response:
{
  "response": "TypeScript - bu...",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "tokensUsed": {
    "input": 15,
    "output": 120,
    "total": 135
  },
  "usage": {
    "daily": 5,
    "dailyLimit": 20
  }
}
```

#### Chat Tarixi
```bash
GET /api/v1/ai/history?limit=20
Authorization: Bearer YOUR_JWT_TOKEN
# yoki
X-API-Key: sk_your_api_key
```

### 👨‍💼 Admin Endpoints

#### Tizim Statistikasi
```bash
GET /api/v1/admin/stats
Authorization: Bearer ADMIN_JWT_TOKEN

# Response:
{
  "overview": {
    "totalUsers": 150,
    "activeUsers": 145,
    "totalRequests": 5420,
    "totalPrompts": 3200,
    "requests24h": 320,
    "prompts24h": 180
  },
  "providerUsage": [
    { "_id": "deepseek", "count": 2100, "totalTokens": 450000 },
    { "_id": "gemini", "count": 1100, "totalTokens": 280000 }
  ],
  "tierDistribution": [
    { "_id": "free", "count": 120 },
    { "_id": "pro", "count": 25 },
    { "_id": "enterprise", "count": 5 }
  ]
}
```

#### Foydalanuvchilar Ro'yxati
```bash
GET /api/v1/admin/users?page=1&limit=20&tier=free&isActive=true
Authorization: Bearer ADMIN_JWT_TOKEN
```

#### User Tier Yangilash
```bash
PUT /api/v1/admin/users/:userId/tier
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "tier": "pro"  // "free", "pro", "enterprise"
}
```

#### User Statusni O'zgartirish
```bash
POST /api/v1/admin/users/:userId/toggle
Authorization: Bearer ADMIN_JWT_TOKEN
```

#### Request Loglar
```bash
GET /api/v1/admin/logs?page=1&limit=50&userId=...&statusCode=200
Authorization: Bearer ADMIN_JWT_TOKEN
```

#### AI Konfiguratsiya
```bash
# Olish
GET /api/v1/admin/ai/config
Authorization: Bearer ADMIN_JWT_TOKEN

# Yangilash
PUT /api/v1/admin/ai/config
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "deepseek": {
    "apiKey": "sk-...",
    "model": "deepseek-chat",
    "maxTokens": 4096
  },
  "gemini": {
    "apiKey": "AIza...",
    "model": "gemini-pro",
    "maxTokens": 4096
  }
}

# Default Provider
POST /api/v1/admin/ai/default-provider
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "provider": "deepseek"
}
```

## 🔒 Autentifikatsiya

### 1. JWT Token (Users)
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. API Key (External Apps)
```bash
X-API-Key: sk_a1b2c3d4e5f6g7h8i9j0...
# yoki
Authorization: Bearer sk_a1b2c3d4e5f6g7h8i9j0...
```

## 📊 User Tiers & Quotas

| Tier | Kunlik Limit | Oylik Limit | Max Tokens | API Keys |
|------|--------------|-------------|------------|----------|
| Free | 20 | 1000 | 2048 | 2 |
| Pro | 100 | 5000 | 8192 | 5 |
| Enterprise | ∞ | ∞ | 16384 | 10 |

## 🛡️ Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global | 100 req | 15 min |
| AI Chat | 5 req | 1 min |
| Login/Register | 5 req | 15 min |

## 🔧 Environment Variables

### Asosiy
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
```

### AI Providers
```env
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AIza...
DEFAULT_AI_PROVIDER=deepseek
DEFAULT_AI_MODEL=deepseek-chat
AI_MAX_OUTPUT_TOKENS=4096
AI_REQUEST_TIMEOUT_MS=120000
```

### Redis (Upstash)
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_WINDOW_MS=60000
AI_RATE_LIMIT_MAX_REQUESTS=5
```

### API Keys
```env
API_KEY_PREFIX=sk_
API_KEY_EXPIRES_IN_DAYS=365
```

### Features
```env
ENABLE_REQUEST_LOGGING=true
ENABLE_USAGE_TRACKING=true
CORS_ORIGINS=https://app.example.com,https://admin.example.com
TRUST_PROXY=true
```

### Limits
```env
AI_DAILY_LIMIT=20
DEFAULT_MONTHLY_REQUEST_LIMIT=1000
```

## 📦 Dependencies

```json
{
  "@google/generative-ai": "^0.21.0",
  "@upstash/redis": "^1.34.0",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.19.2",
  "express-rate-limit": "^7.2.0",
  "helmet": "^7.1.0",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.3.0",
  "morgan": "^1.10.0",
  "node-cron": "^4.6.0",
  "openai": "^4.77.3",
  "uuid": "^11.0.3"
}
```

## 🚦 Test Qilish

### 1. Health Check
```bash
curl http://localhost:5000
curl http://localhost:5000/health
```

### 2. User Registration
```bash
curl -X POST http://localhost:5000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 4. AI Chat (with token)
```bash
curl -X POST http://localhost:5000/api/v1/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello AI!",
    "provider": "deepseek"
  }'
```

### 5. Create API Key
```bash
curl -X POST http://localhost:5000/api/v1/users/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "expiresInDays": 30
  }'
```

### 6. AI Chat (with API key)
```bash
curl -X POST http://localhost:5000/api/v1/ai/chat \
  -H "X-API-Key: sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello via API key!"
  }'
```

## 🏗️ Project Structure

```
src/
├── config/
│   ├── ai.js           # AI providers config
│   ├── db.js           # MongoDB connection
│   └── redis.js        # Redis/Upstash config
├── middlewares/
│   ├── auth.js         # JWT authentication
│   ├── apiKeyAuth.js   # API key authentication
│   ├── rateLimiter.js  # Rate limiting
│   ├── requestLogger.js # Request logging
│   └── errorHandler.js # Error handling
├── models/
│   ├── User.js         # User model
│   ├── ApiKey.js       # API keys model
│   ├── Prompt.js       # Chat history model
│   ├── RequestLog.js   # Request logs model
│   └── SystemConfig.js # System configuration
├── modules/
│   ├── user/
│   │   ├── user.routes.js
│   │   ├── user.controller.js
│   │   └── apiKey.controller.js
│   ├── ai/
│   │   ├── ai.routes.js
│   │   ├── ai.controller.js
│   │   └── ai.service.js
│   └── admin/
│       ├── admin.routes.js
│       ├── controllers/
│       │   ├── adminAi.controller.js
│       │   └── adminUser.controller.js
│       └── services/
│           └── adminAi.service.js
├── utils/
│   ├── logger.js       # Simple logger
│   ├── initConfig.js   # DB initialization
│   └── scheduler.js    # Cron jobs
├── app.js
└── server.js
```

## 🔥 Features Highlights

1. **Multiple AI Providers** - DeepSeek, Gemini (easily extensible)
2. **Flexible Auth** - JWT tokens + API keys
3. **Advanced Rate Limiting** - Redis-backed with memory fallback
4. **Usage Tracking** - Per-user daily/monthly limits
5. **Admin Dashboard** - Full control over users & system
6. **Request Logging** - Complete audit trail
7. **Automated Maintenance** - Cron-based quota resets
8. **Tier System** - Free, Pro, Enterprise
9. **Security** - Helmet, CORS, hashed passwords, hashed API keys
10. **Production Ready** - Error handling, logging, monitoring

## ⚠️ Important Notes

### MongoDB Atlas Setup
MongoDB Atlas'da IP whitelist sozlang:
1. [MongoDB Atlas](https://cloud.mongodb.com) ga kiring
2. **Database → Network Access**
3. **Add IP Address**
4. **Allow Access from Anywhere** (0.0.0.0/0) yoki o'z IP manzilingizni qo'shing
5. Serverni qayta ishga tushiring

### Production Deployment
- `.env` faylini `.gitignore` ga qo'shing
- `NODE_ENV=production` o'rnating
- `JWT_SECRET` ni xavfsiz qilib yarating
- MongoDB va Redis uchun production credentials ishlatng
- CORS originsni aniq ko'rsating
- `TRUST_PROXY=true` ni reverse proxy uchun o'rnating

## 🎯 Keyingi Qadamlar

### Qo'shilishi Mumkin Bo'lgan Funksiyalar:

1. **Email Verification** - User registration'dan keyin email tasdiqlash
2. **Password Reset** - Parolni unutgan holat uchun
3. **Webhooks** - Event notifications
4. **File Upload** - S3 integration
5. **Streaming Responses** - Real-time AI chat
6. **Web Search Integration** - AI uchun qo'shimcha ma'lumot
7. **Multi-language Support** - i18n
8. **Advanced Analytics** - Grafana/Prometheus
9. **Payment Integration** - Stripe for subscriptions
10. **RAG System** - Vector database integration (Pinecone, Qdrant)

## 📝 License

ISC

## 👨‍💻 Author

Asilbek

---

**Server Status:** ✅ RUNNING  
**Port:** 5000  
**Version:** 1.0.0  
**Last Updated:** 2026-08-19
