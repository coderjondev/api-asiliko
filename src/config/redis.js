const { Redis } = require("@upstash/redis");
const logger = require("../utils/logger");

let redisClient = null;

const initRedis = () => {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      logger.info("✅ Redis ulandi");
    } else {
      logger.warn("⚠️ Redis konfiguratsiyasi topilmadi, rate limiting ishlamaydi");
    }
  } catch (error) {
    logger.error("Redis ulanish xatosi:", error.message);
  }
};

const getRedisClient = () => {
  return redisClient;
};

// Alias — ai.service.js va boshqa joylarda shu nom bilan ishlatiladi.
// getRedisClient farqli o'laroq, xato tashlamaydi — null qaytaradi,
// chaqiruvchi tomon "Redis yo'q" holatini o'zi hal qilishi kerak (masalan cache skip).
const getRedis = () => redisClient;

module.exports = { initRedis, getRedisClient, getRedis, redisClient };
