const { getRedis } = require("../config/redis");
const logger = require("../utils/logger");

/**
 * express-rate-limit uchun Upstash Redis (REST-based) bilan ishlaydigan
 * store. `rate-limit-redis` paketi standart ioredis/node-redis clientini
 * kutadi, Upstash esa boshqa (REST) interfeysga ega — shuning uchun
 * express-rate-limit'ning "Store" interfeysini o'zimiz qisqacha amalga
 * oshiramiz (fixed-window counter, INCR + EXPIRE asosida).
 *
 * Redis mavjud bo'lmasa (masalan lokal/dev muhitda), chaqiruvchi tomon
 * buning o'rniga express-rate-limit'ning standart MemoryStore'ini
 * ishlatishi kerak — buni createRateLimiter() hal qiladi.
 */
class UpstashRateLimitStore {
  constructor({ prefix = "rl:", windowMs }) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  // express-rate-limit v7 store interfeysi shu metodlarni chaqiradi
  init(options) {
    this.windowMs = options.windowMs;
  }

  key(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    const redis = getRedis();
    const redisKey = this.key(key);
    const windowSeconds = Math.ceil(this.windowMs / 1000);

    try {
      // Upstash Redis (REST) klientida pipeline/multi qo'llab-quvvatlanadi
      const pipeline = redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, windowSeconds, "NX"); // faqat birinchi marta TTL qo'yiladi
      const results = await pipeline.exec();

      const totalHits = Number(results[0]) || 1;

      // resetTime aniq bo'lmasa ham (Upstash TTL qiymatini alohida so'rov
      // bilan olish kerak bo'ladi), taxminiy qiymat berish yetarli —
      // express-rate-limit buni faqat "Retry-After" headerida ishlatadi.
      const resetTime = new Date(Date.now() + this.windowMs);

      return { totalHits, resetTime };
    } catch (error) {
      logger.error("Redis rate-limit increment xatosi:", error.message);
      // Redis vaqtincha ishlamay qolsa, so'rovni bloklab qo'ymaslik uchun
      // "limitga yetilmagan" deb hisoblaymiz — mavjudlik ustunligi (fail-open).
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key) {
    const redis = getRedis();
    try {
      await redis.decr(this.key(key));
    } catch (error) {
      logger.error("Redis rate-limit decrement xatosi:", error.message);
    }
  }

  async resetKey(key) {
    const redis = getRedis();
    try {
      await redis.del(this.key(key));
    } catch (error) {
      logger.error("Redis rate-limit reset xatosi:", error.message);
    }
  }
}

module.exports = { UpstashRateLimitStore };
