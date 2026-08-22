const SystemConfig = require("../models/SystemConfig");
const logger = require("../utils/logger");
const { getSupportedProviderNames } = require("../modules/ai/providers/registry");

/**
 * Har bir kod darajasida qo'llab-quvvatlanadigan provider uchun, .env
 * faylida mos ENV_KEY_API_KEY (masalan OPENAI_API_KEY, ANTHROPIC_API_KEY)
 * mavjud bo'lsa, shundan foydalanib boshlang'ich SystemConfig("ai")
 * qiymatini tuzadi.
 *
 * ILGARI: bu yerda faqat "deepseek" va "gemini" uchun qattiq yozilgan
 * edi — .env faylida OPENAI_API_KEY/ANTHROPIC_API_KEY bo'lsa ham,
 * ular hech qachon SystemConfig'ga yozilmasdi (jim e'tiborsiz
 * qoldirilardi). Endi registry.js dagi barcha providerlar ustidan
 * avtomatik aylanadi.
 */
const DEFAULT_MODELS = {
  deepseek: "deepseek-chat",
  gemini: "gemini-2.0-flash-exp",
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
};

const envKeyFor = (providerName) => `${providerName.toUpperCase()}_API_KEY`;

/**
 * MUHIM: birinchi ulanish paytida TLS/tarmoq nosozligi bo'lishi mumkin
 * (Atlas + Node.js TLS handshake muammosi — "SSL alert number 80" kabi
 * xatolar db.js'da izohlangan). Shuning uchun bu yerda ham kichik retry
 * qo'shildi — aks holda bitta vaqtinchalik tarmoq uzilishi butun AI
 * konfiguratsiyasining hech qachon yaratilmasligiga olib kelardi
 * (server qayta ishga tushirilmaguncha).
 */
async function initializeSystemConfig(retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const aiConfig = await SystemConfig.findOne({ key: "ai" });

      if (!aiConfig) {
        const defaultConfig = {
          defaultProvider: process.env.DEFAULT_AI_PROVIDER || "deepseek",
          limits: {
            timeout: parseInt(process.env.AI_REQUEST_TIMEOUT_MS) || 120000,
          },
        };

        const configuredProviders = [];

        for (const providerName of getSupportedProviderNames()) {
          const apiKey = process.env[envKeyFor(providerName)];
          if (!apiKey) continue;

          defaultConfig[providerName] = {
            apiKey,
            model:
              providerName === "deepseek"
                ? process.env.DEFAULT_AI_MODEL || DEFAULT_MODELS[providerName]
                : DEFAULT_MODELS[providerName],
            maxTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS) || 4096,
          };
          configuredProviders.push(providerName);
        }

        await SystemConfig.create({
          key: "ai",
          value: defaultConfig,
          description: "AI provider configuration",
          isActive: true,
        });

        if (configuredProviders.length > 0) {
          logger.info(`✅ AI konfiguratsiyasi yaratildi (${configuredProviders.join(", ")} uchun .env'dan API key topildi)`);
        } else {
          logger.warn(
            "⚠️ AI konfiguratsiyasi yaratildi, lekin .env faylida hech qanday *_API_KEY topilmadi — provayderlarni admin panel orqali (PUT /api/v1/admin/ai/config) sozlang"
          );
        }
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

      return; // muvaffaqiyatli — qayta urinish shart emas
    } catch (error) {
      const isLastAttempt = attempt === retries;
      logger.error(
        `System config yaratishda xatolik (urinish ${attempt}/${retries}): ${error.message}`
      );

      if (!isLastAttempt) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logger.warn(
          "⚠️ System config yaratilmadi — bu odatda MongoDB bilan TLS/tarmoq muammosi. Server baribir ishga tushadi, lekin AI so'rovlar ishlamasligi mumkin."
        );
      }
    }
  }
}

module.exports = { initializeSystemConfig };
