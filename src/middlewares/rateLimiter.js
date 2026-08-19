const rateLimit = require("express-rate-limit");

const createRateLimiter = (options = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = "Too many requests, please try again later",
    skipSuccessfulRequests = false,
  } = options;

  return rateLimit({
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
  });
};

const globalLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Juda ko'p so'rovlar, keyinroq qayta urinib ko'ring",
});

const aiLimiter = createRateLimiter({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 5,
  message: "AI so'rovlar limiti tugadi, 1 daqiqadan keyin qayta urinib ko'ring",
  skipSuccessfulRequests: false,
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Juda ko'p login urinishlari, 15 daqiqadan keyin qayta urinib ko'ring",
  skipSuccessfulRequests: true,
});

module.exports = {
  globalLimiter,
  aiLimiter,
  authLimiter,
  createRateLimiter,
};
