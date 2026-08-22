# Asiliko API

AI so'rovlar, admin panel (permission-based), fayl yuklash, webhook va
to'lov (Stripe, disabled-by-default) imkoniyatlariga ega Express.js
backend xizmati.

## Talablar

- Node.js 18+
- MongoDB
- (Ixtiyoriy) Upstash Redis — rate limiting va AI javob keshi uchun
- (Ixtiyoriy) AWS S3 yoki mos xizmat — fayl yuklash uchun
- (Ixtiyoriy) Stripe hisobi — to'lov tizimi uchun

## O'rnatish

```bash
npm install
cp .env.example .env
# .env faylini to'ldiring: MONGO_URI, JWT_SECRET shart;
# qolganlari ixtiyoriy — yo'q bo'lsa tegishli funksiya avtomatik o'chadi
npm run dev
```

Server ishga tushgandan keyin `/health` orqali tekshiring.

## Birinchi admin yaratish

Admin panel faqat mavjud adminlar orqali yangi admin tayinlashi mumkin
— shuning uchun birinchi (super-admin) foydalanuvchi alohida skript
bilan tayinlanadi:

```bash
# Avval oddiy foydalanuvchi sifatida ro'yxatdan o'ting:
# POST /api/v1/auth/register

# Keyin shu emailni super-admin qiling:
npm run bootstrap:admin sizning@emailingiz.com
```

## Boshlang'ich tariflarni yaratish

```bash
npm run seed:plans
```

`free`/`pro`/`enterprise` tariflarini yaratadi. Bulardan keyin barcha
tariflarni (narx, limitlar, features) admin panel orqali
(`/api/v1/admin/plans`) istalgancha tahrirlash, o'chirish yoki yangi
tarif qo'shish mumkin.

## API hujjatlari

Server ishga tushgandan keyin interaktiv hujjat shu yerda:

```
http://localhost:5000/api-docs
```

Xom OpenAPI spec: `/api-docs.json` (Postman/Insomnia import qilish
uchun). `.env` da `SWAGGER_ENABLED=false` qilib o'chirish mumkin.

## AI javob feedback (👍/👎) va refresh

`POST /api/v1/ai/chat` javobida `promptId` qaytadi — shu ID orqali:
- `POST /api/v1/ai/:promptId/feedback` — `{rating: "good"|"bad", comment?}`
- `POST /api/v1/ai/:promptId/regenerate` — javobni qayta generatsiya
  qilish ("refresh"), eski javob va uning feedback'i tarixda saqlanadi

## Ko'p tillilik (i18n)

Barcha API xabarlari (xatoliklar, muvaffaqiyat xabarlari) 11 tilda:
`uz, en, ru, tr, de, fr, es, ar, zh, ja, ko` (`src/i18n/locales/`).

Til aniqlash tartibi: `?lang=ru` query → foydalanuvchi profilidagi
`language` → `Accept-Language` header → `en` (standart).

Foydalanuvchi o'z tilini saqlab qo'yishi mumkin:
```
PUT /api/v1/auth/language
{ "language": "ru" }
```

**Yangi til qo'shish** (kelajakda 12+, 20+ va h.k.):
1. `src/i18n/locales/<kod>.json` yarating (mavjud `en.json` bilan bir
   xil kalitlar to'plami bilan)
2. `src/i18n/index.js` dagi `SUPPORTED_LANGUAGES` ro'yxatiga kodni
   qo'shing
3. Tamom — middleware, controllerlar avtomatik qo'llab-quvvatlaydi

**Yangi controller'da tarjima ishlatish**:
```js
res.status(400).json({ error: req.t("auth.invalid_credentials") });
// Parametrli: req.t("ai.model_not_found", { model: "gpt-4o" })
```
Service qatlamida (controller'dan tashqarida) xato tashlanganda,
`err.i18nKey` va `err.i18nParams` qo'shing — controller shuni
`req.t()` bilan tarjima qiladi (`ai.service.js` dagi misollarga
qarang).

## Loyiha strukturasi

```
src/
  app.js              # Express konfiguratsiyasi, middleware va route ro'yxati
  server.js           # Server ishga tushirish, DB ulanish
  config/             # Redis, S3, Stripe, Swagger, AI provider konfiguratsiyasi
  constants/roles.js  # Permission-based admin ruxsat kodlari
  middlewares/        # auth, rate limit, error handler, request logger
  models/             # Mongoose modellar (User, Plan, AIModel, ...)
  modules/
    auth/             # Ro'yxatdan o'tish, login, email tasdiqlash
    user/             # Profil, API key boshqaruvi
    ai/               # AI chat/streaming
    admin/            # Admin panel: foydalanuvchilar, modellar, tariflar,
                       # analitika, adminlarni boshqarish
    billing/          # Stripe checkout/portal/webhook
    file/             # S3 fayl yuklash
    webhook/          # Foydalanuvchi webhooklari
  utils/              # logger, webhook yuborish, SSRF himoyasi va h.k.
scripts/              # bootstrap/seed uchun bir martalik CLI skriptlar
```

## AI provider tizimi (adapter pattern)

Yangi AI provider qo'shish uchun kodga tegish shart emas — faqat admin
panel yoki `.env` orqali API key qo'yish kifoya, **agar** o'sha
provider uchun allaqachon adapter mavjud bo'lsa.

Hozir tayyor adapterlar: `deepseek`, `gemini`, `openai`, `anthropic`
(`src/modules/ai/providers/`). Qo'llab-quvvatlanadigan providerlar
ro'yxatini `GET /api/v1/admin/models/supported-providers` orqali olish
mumkin.

**Yangi provider qo'shish (masalan Mistral, Groq):**
1. `src/modules/ai/providers/<nom>.provider.js` yarating — `createClient`,
   `chat`, `chatStream` metodlari bilan (`adapter.interface.js` shakliga
   qarang)
2. `src/modules/ai/providers/registry.js` ga bitta qator qo'shing
3. Tamom — `ai.service.js`, `config/ai.js`, admin controllerga tegish
   shart emas

API kalitlarni ikki xil joyda berish mumkin:
- `.env` da `<PROVIDER>_API_KEY` (masalan `OPENAI_API_KEY`) — server
  birinchi marta ishga tushganda avtomatik `SystemConfig`ga yoziladi
- Admin panelda `PUT /api/v1/admin/ai/config` orqali — istalgan vaqtda

## Permission-based admin tizimi

Admin foydalanuvchilar bitta "admin" rolига emas, balki alohida
ruxsatlar to'plamiga ega (`src/constants/roles.js` dagi `PERMISSIONS`).
Tayyor presetlar: `super_admin`, `model_manager`, `support`, `viewer`,
`billing_manager` — `POST /api/v1/admin/admins/grant` orqali
qo'llaniladi, keyin har bir adminning ruxsatlari individual
o'zgartirilishi mumkin.

## To'lov tizimi (Stripe)

Kod to'liq tayyor, lekin ikki qatlamli xavfsizlik bilan:
1. `.env` da `STRIPE_SECRET_KEY` bo'lishi shart
2. **Va** admin panelda yoqilgan bo'lishi kerak: `PUT /api/v1/admin/billing/config`

Ikkalasi bajarilmasa, billing endpointlari `503` qaytaradi — hech qanday
Stripe chaqiruviga urinmaydi.

## Muhim environment o'zgaruvchilari

To'liq ro'yxat `.env.example` da. Eng zarurlari:

| O'zgaruvchi | Talab qilinadimi | Tavsif |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB ulanish satri |
| `JWT_SECRET` | ✅ | JWT token imzolash uchun |
| `UPSTASH_REDIS_REST_URL/TOKEN` | ❌ | Rate limiting + AI kesh uchun |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | ❌ | Fayl yuklash uchun |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ❌ | To'lov tizimi uchun |
| `SWAGGER_ENABLED` | ❌ | `false` qilib API hujjatini yopish |

Har bir ixtiyoriy xizmat sozlanmasa, server baribir ishga tushadi —
faqat tegishli funksiya (masalan fayl yuklash) 503 qaytaradi.

## Muammolarni bartaraf etish

### "SSL alert number 80" / "tlsv1 alert internal error" (MongoDB Atlas)

Bu xato odatda `connectDB()` muvaffaqiyatli tugagandan **keyin**,
birinchi haqiqiy so'rov paytida chiqadi (log'da "✅ MongoDB ulandi"
ko'ringan bo'lsa ham). Sabab — Node.js/OpenSSL bilan Atlas orasidagi
TLS handshake muammosi, ko'pincha quyidagilardan biri:

1. **Node.js versiyasi** — LTS versiyasiga o'ting:
   ```bash
   nvm install --lts
   nvm use --lts
   ```
2. **VPN/corporate firewall** — ba'zi tarmoqlar TLS paketlarini
   buzadi. Vaqtincha o'chirib ko'ring yoki boshqa tarmoqdan (masalan
   mobil internet) sinab ko'ring.
3. **IP whitelist** — MongoDB Atlas → Network Access → joriy IP
   manzilingiz qo'shilganini tekshiring.
4. **DNS keshi** — `mongodb+srv://` o'rniga Atlas'dan standart
   `mongodb://` (barcha shard manzillari bilan) ulanish satrini olib
   sinab ko'ring.

Server bu xatoda **ishga tushishda davom etadi** (3 marta avtomatik
qayta urinib ko'radi), lekin MongoDB'ga bog'liq funksiyalar (login,
AI so'rovlar) muammo hal bo'lmaguncha ishlamaydi. Holatni
`GET /health/detailed` orqali tekshiring.

