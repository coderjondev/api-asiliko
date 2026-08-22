const rateLimit = require("express-rate-limit");
const { getRedis } = require("../config/redis");
const { UpstashRateLimitStore } = require("./redisRateLimitStore");

const buildLimiter = (options = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = "Too many requests, please try again later",
    skipSuccessfulRequests = false,
    keyPrefix = "rl",
  } = options;

  const limiterOptions = {
    windowMs,
    max,
    message: { error: message },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  };

  // Redis mavjud bo'lsa (Upstash ulangan bo'lsa) undan foydalanamiz —
  // shunda bir nechta server instansiyasi (masalan Docker/K8s replikalar)
  // bir xil hisobni ko'radi. Aks holda express-rate-limit'ning ichki
  // MemoryStore'iga (default) fallback qilamiz.
  if (getRedis()) {
    limiterOptions.store = new UpstashRateLimitStore({
      prefix: `${keyPrefix}:`,
      windowMs,
    });
  }

  return rateLimit(limiterOptions);
};

/**
 * express-rate-limit so'rov handler ichida yangi instansiya yaratishni
 * ataylab bloklaydi (ERR_ERL_CREATED_IN_REQUEST_HANDLER), shuning uchun
 * "birinchi so'rovda yasash" strategiyasi ishlamaydi. Buning o'rniga
 * limiterlarni chaqiruvchi (app.js) initRedis() dan KEYIN, aniq
 * initializeLimiters() chaqiruvi orqali yaratadi. Shu vaqtgacha bu
 * o'zgaruvchilar `null` bo'ladi — app.js ularni to'g'ri tartibda
 * ishlatishi kerak (pastdagi initializeLimiters() ga qarang).
 */
let globalLimiter = null;
let aiLimiter = null;
let authLimiter = null;

const initializeLimiters = () => {
  globalLimiter = buildLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: "Juda ko'p so'rovlar, keyinroq qayta urinib ko'ring",
    keyPrefix: "rl:global",
  });

  aiLimiter = buildLimiter({
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 5,
    message: "AI so'rovlar limiti tugadi, 1 daqiqadan keyin qayta urinib ko'ring",
    skipSuccessfulRequests: false,
    keyPrefix: "rl:ai",
  });

  authLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Juda ko'p login urinishlari, 15 daqiqadan keyin qayta urinib ko'ring",
    skipSuccessfulRequests: true,
    keyPrefix: "rl:auth",
  });

  return { globalLimiter, aiLimiter, authLimiter };
};

// Middleware sifatida module require paytida ro'yxatdan o'tkazish uchun
// (route fayllarida `router.post("/x", authLimiter, ...)` kabi ishlatiladi),
// haqiqiy limiterga so'rov kelganda yo'naltiruvchi "proxy" middleware beramiz.
// Bu route fayllarini o'zgartirishga majbur qilmaydi.
const proxyMiddleware = (getLimiter, name) => (req, res, next) => {
  const limiter = getLimiter();
  if (!limiter) {
    // initializeLimiters() hali chaqirilmagan bo'lsa (noto'g'ri sozlash) —
    // so'rovni bloklab qo'ymaslik uchun o'tkazib yuboramiz, lekin log qilamiz.
    require("../utils/logger").warn(
      `Rate limiter "${name}" hali initsializatsiya qilinmagan — so'rov tekshiruvsiz o'tkazildi`
    );
    return next();
  }
  return limiter(req, res, next);
};

module.exports = {
  get globalLimiter() {
    return proxyMiddleware(() => globalLimiter, "global");
  },
  get aiLimiter() {
    return proxyMiddleware(() => aiLimiter, "ai");
  },
  get authLimiter() {
    return proxyMiddleware(() => authLimiter, "auth");
  },
  initializeLimiters,
  createRateLimiter: buildLimiter,
};
