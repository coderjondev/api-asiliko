/**
 * Provider registry — barcha qo'llab-quvvatlanadigan AI provider
 * adapterlarining markaziy ro'yxati.
 *
 * YANGI PROVIDER QO'SHISH UCHUN:
 *   1. providers/<nom>.provider.js yarating (adapter.interface.js
 *      shakliga rioya qilib: createClient, chat, chatStream)
 *   2. Shu yerga bitta qator qo'shing: require + kalit nomi
 *   3. TAMOM. ai.service.js, config/ai.js, admin controller — hech
 *      birini o'zgartirish shart emas.
 *
 * Kalit nomi (masalan "openai") — admin panelda SystemConfig("ai")
 * ichida ishlatiladigan provider identifikatori bilan bir xil bo'lishi
 * kerak (masalan { openai: { apiKey: "..." } }).
 */

const deepseek = require("./deepseek.provider");
const gemini = require("./gemini.provider");
const openai = require("./openai.provider");
const anthropic = require("./anthropic.provider");

const PROVIDER_REGISTRY = {
  deepseek,
  gemini,
  openai,
  anthropic,
};

/**
 * Berilgan provider nomi uchun adapterni qaytaradi.
 * @throws provider ro'yxatda bo'lmasa
 */
const getAdapter = (providerName) => {
  const adapter = PROVIDER_REGISTRY[providerName];
  if (!adapter) {
    const available = Object.keys(PROVIDER_REGISTRY).join(", ");
    const err = new Error(
      `Noma'lum AI provider: "${providerName}". Mavjud adapterlar: ${available}. Yangi provider qo'shish uchun src/modules/ai/providers/registry.js ga qarang.`
    );
    err.statusCode = 400;
    err.i18nKey = "ai.unknown_provider";
    err.i18nParams = { provider: providerName, available };
    throw err;
  }
  return adapter;
};

/**
 * Kod darajasida qo'llab-quvvatlanadigan barcha provider nomlarini
 * qaytaradi (API kaliti sozlanganmi yoki yo'qmi — bunga bog'liq emas,
 * faqat adapter mavjudmi degan ma'noda).
 */
const getSupportedProviderNames = () => Object.keys(PROVIDER_REGISTRY);

module.exports = { getAdapter, getSupportedProviderNames, PROVIDER_REGISTRY };
