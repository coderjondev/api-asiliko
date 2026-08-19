const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const SystemConfig = require("../models/SystemConfig");
const logger = require("../utils/logger");

class AIConfig {
  constructor() {
    this.providers = {};
    this.defaultProvider = "deepseek";
  }

  async initialize() {
    try {
      const config = await SystemConfig.getConfig("ai");

      if (config?.deepseek?.apiKey) {
        this.providers.deepseek = new OpenAI({
          baseURL: "https://api.deepseek.com/v1",
          apiKey: config.deepseek.apiKey,
          timeout: config.limits?.timeout || 120000,
        });
        this.providers.deepseek.config = config.deepseek;
      }

      if (config?.gemini?.apiKey) {
        this.providers.gemini = new GoogleGenerativeAI(config.gemini.apiKey);
        this.providers.gemini.config = config.gemini;
      }

      this.defaultProvider = config.defaultProvider || "deepseek";
      this.globalLimits = config.limits || {};

      logger.info("✅ AI provayderlar yuklandi");
    } catch (error) {
      logger.error("AI provayderlarni yuklashda xatolik:", error.message);
    }
  }

  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`AI provayder topilmadi: ${providerName}`);
    }
    return provider;
  }

  getProviderConfig(providerName) {
    const config = this.providers[providerName]?.config;
    if (!config) {
      throw new Error(
        `AI provayder konfiguratsiyasi topilmadi: ${providerName}`,
      );
    }
    return config;
  }

  getDefaultProvider() {
    return this.defaultProvider;
  }

  getLimits() {
    return this.globalLimits;
  }

  async getQuota(userTier = "free") {
    const config = await SystemConfig.getConfig("quotas");
    return (
      config?.[userTier] ||
      config?.free || {
        daily: 10,
        monthly: 200,
        maxTokens: 2048,
      }
    );
  }
}

module.exports = new AIConfig();
