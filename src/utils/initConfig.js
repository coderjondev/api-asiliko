const SystemConfig = require("../models/SystemConfig");
const logger = require("../utils/logger");

async function initializeSystemConfig() {
  try {
    const aiConfig = await SystemConfig.findOne({ key: "ai" });

    if (!aiConfig) {
      const defaultConfig = {
        defaultProvider: process.env.DEFAULT_AI_PROVIDER || "deepseek",
        deepseek: {
          apiKey: process.env.DEEPSEEK_API_KEY,
          model: process.env.DEFAULT_AI_MODEL || "deepseek-chat",
          maxTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS) || 4096,
        },
        gemini: {
          apiKey: process.env.GEMINI_API_KEY,
          model: "gemini-pro",
          maxTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS) || 4096,
        },
        limits: {
          timeout: parseInt(process.env.AI_REQUEST_TIMEOUT_MS) || 120000,
        },
      };

      await SystemConfig.create({
        key: "ai",
        value: defaultConfig,
        description: "AI provider configuration",
        isActive: true,
      });

      logger.info("✅ AI konfiguratsiyasi yaratildi");
    }

    const quotasConfig = await SystemConfig.findOne({ key: "quotas" });

    if (!quotasConfig) {
      const defaultQuotas = {
        free: {
          daily: parseInt(process.env.AI_DAILY_LIMIT) || 20,
          monthly: parseInt(process.env.DEFAULT_MONTHLY_REQUEST_LIMIT) || 1000,
          maxTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS) || 2048,
        },
        pro: {
          daily: 100,
          monthly: 5000,
          maxTokens: 8192,
        },
        enterprise: {
          daily: -1,
          monthly: -1,
          maxTokens: 16384,
        },
      };

      await SystemConfig.create({
        key: "quotas",
        value: defaultQuotas,
        description: "User tier quotas",
        isActive: true,
      });

      logger.info("✅ Quotalar konfiguratsiyasi yaratildi");
    }
  } catch (error) {
    logger.error("System config yaratishda xatolik:", error.message);
  }
}

module.exports = { initializeSystemConfig };
