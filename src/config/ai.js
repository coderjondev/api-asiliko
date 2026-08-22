const SystemConfig = require("../models/SystemConfig");
const logger = require("../utils/logger");
const { getAdapter, getSupportedProviderNames } = require("../modules/ai/providers/registry");

/**
 * AI provider konfiguratsiyasi.
 *
 * ILGARI: bu fayl har bir provider uchun alohida if-blok bilan qattiq
 * yozilgan edi (faqat deepseek va gemini) — yangi provider (masalan
 * openai, anthropic) qo'shish uchun shu faylni VA ai.service.js ni
 * qo'lda o'zgartirish kerak edi.
 *
 * ENDI: providers/registry.js dagi barcha adapterlar ustidan avtomatik
 * aylanadi (loop). SystemConfig("ai") ichida qaysi provider uchun
 * apiKey berilgan bo'lsa, o'sha provider uchun klient yaratiladi —
 * kod o'zgartirish shart emas, faqat admin panelda API key qo'shish
 * kifoya (agar adapter allaqachon mavjud bo'lsa).
 */
class AIConfig {
  constructor() {
    this.providers = {};
    this.defaultProvider = "deepseek";
    this.globalLimits = {};
  }

  /**
   * MUHIM: bu funksiya birinchi haqiqiy MongoDB so'rovlaridan biri
   * bo'lishi mumkin (server ishga tushish jarayonida), shuning uchun
   * vaqtinchalik TLS/tarmoq nosozligiga (masalan "SSL alert number 80")
   * duch kelishi mumkin — retry bilan mustahkamlangan (db.js dagi
   * izohga qarang).
   */
  async initialize(retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = await SystemConfig.getConfig("ai");

        if (!config) {
          logger.warn("SystemConfig('ai') topilmadi — hech qanday AI provider yuklanmadi");
          return;
        }

        const supportedNames = getSupportedProviderNames();
        const loadedProviders = [];

        for (const providerName of supportedNames) {
          const providerConfig = config[providerName];
          if (!providerConfig?.apiKey) continue; // bu provider uchun kalit berilmagan

          try {
            const adapter = getAdapter(providerName);
            const client = adapter.createClient(providerConfig);

            if (client) {
              this.providers[providerName] = client;
              this.providers[providerName].config = providerConfig;
              loadedProviders.push(providerName);
            }
          } catch (error) {
            logger.error(`"${providerName}" provayderini yuklashda xatolik:`, error.message);
          }
        }

        this.defaultProvider = config.defaultProvider || "deepseek";
        this.globalLimits = config.limits || {};

        if (loadedProviders.length > 0) {
          logger.info(`✅ AI provayderlar yuklandi: ${loadedProviders.join(", ")}`);
        } else {
          logger.warn(
            "⚠️ Hech qanday AI provider uchun API key sozlanmagan (SystemConfig('ai'))"
          );
        }

        return; // muvaffaqiyatli — qayta urinish shart emas
      } catch (error) {
        const isLastAttempt = attempt === retries;
        logger.error(
          `AI provayderlarni yuklashda xatolik (urinish ${attempt}/${retries}): ${error.message}`
        );

        if (!isLastAttempt) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          logger.warn(
            "⚠️ AI provayderlar yuklanmadi — bu odatda MongoDB bilan TLS/tarmoq muammosi. AI so'rovlar ishlamaydi, server /health/detailed orqali holatni ko'rsatadi."
          );
        }
      }
    }
  }

  /**
   * Provider klientini qaytaradi (SDK instansiyasi). Sozlanmagan bo'lsa
   * (API key yo'q yoki adapter mavjud emas) aniq xato tashlaydi.
   */
  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      const configured = Object.keys(this.providers);
      const err = new Error(
        `AI provayder sozlanmagan yoki API key berilmagan: "${providerName}". Sozlangan provayderlar: ${configured.join(", ") || "(yo'q)"}`
      );
      err.statusCode = 400;
      err.i18nKey = "ai.provider_not_configured";
      err.i18nParams = { provider: providerName, configured: configured.join(", ") || "-" };
      throw err;
    }
    return provider;
  }

  getProviderConfig(providerName) {
    const config = this.providers[providerName]?.config;
    if (!config) {
      const err = new Error(`AI provayder konfiguratsiyasi topilmadi: ${providerName}`);
      err.statusCode = 400;
      err.i18nKey = "ai.provider_not_configured";
      err.i18nParams = { provider: providerName, configured: Object.keys(this.providers).join(", ") || "-" };
      throw err;
    }
    return config;
  }

  /**
   * Berilgan providerning adapter obyektini (chat/chatStream metodlari)
   * qaytaradi — ai.service.js buni chaqiradi, provider nomini bilishi
   * shart emas.
   */
  getAdapter(providerName) {
    return getAdapter(providerName);
  }

  getDefaultProvider() {
    return this.defaultProvider;
  }

  getLimits() {
    return this.globalLimits;
  }

  /**
   * Hozir API kaliti sozlangan (ya'ni haqiqatan ishlatsa bo'ladigan)
   * providerlar ro'yxati — admin panel yoki frontend uchun foydali.
   */
  getConfiguredProviders() {
    return Object.keys(this.providers);
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
