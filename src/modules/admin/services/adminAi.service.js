const SystemConfig = require("../../../models/SystemConfig");
const logger = require("../../../utils/logger");

class AdminAIService {
  async getAIConfig() {
    try {
      const config = await SystemConfig.getConfig("ai");
      return config || {};
    } catch (error) {
      logger.error("AI config olishda xatolik:", error.message);
      throw error;
    }
  }

  async updateAIConfig(updates) {
    try {
      const currentConfig = await this.getAIConfig();
      const newConfig = { ...currentConfig, ...updates };

      await SystemConfig.setConfig("ai", newConfig, "AI provider configuration");
      return newConfig;
    } catch (error) {
      logger.error("AI config yangilashda xatolik:", error.message);
      throw error;
    }
  }

  async setDefaultProvider(provider) {
    try {
      const config = await this.getAIConfig();
      config.defaultProvider = provider;

      await SystemConfig.setConfig("ai", config, "AI provider configuration");
      return config;
    } catch (error) {
      logger.error("Default provider o'rnatishda xatolik:", error.message);
      throw error;
    }
  }
}

module.exports = new AdminAIService();
