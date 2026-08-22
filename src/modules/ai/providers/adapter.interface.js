/**
 * AI Provider Adapter — barcha provider adapterlari ushbu shaklga rioya
 * qiladi. Bu orqali ai.service.js hech qanday provider nomini bilishi
 * shart emas — faqat shu 4 ta metodni chaqiradi.
 *
 * Yangi provider qo'shish uchun:
 *   1. src/modules/ai/providers/<nom>.provider.js yarating, shu
 *      interfeysga rioya qilib
 *   2. src/modules/ai/providers/registry.js ga bitta qator qo'shing
 *   3. TAMOM — ai.service.js, config/ai.js ga tegishning shart emas.
 *
 * Har bir adapter quyidagi shaklda eksport qilinadi:
 *
 * {
 *   // SDK klientini API kalit bilan yaratadi. Konfiguratsiya noto'g'ri
 *   // yoki apiKey bo'lmasa, null qaytaradi (xato tashlamaydi — chaqiruvchi
 *   // buni "provider sozlanmagan" deb talqin qiladi).
 *   createClient(providerConfig: { apiKey, baseURL?, ... }): unknown | null,
 *
 *   // Oddiy (stream bo'lmagan) chat so'rovi. Qaytaradi:
 *   //   { response: string, tokensUsed: { input, output, total } }
 *   async chat(client, { model, prompt, maxTokens }): Promise<{response, tokensUsed}>,
 *
 *   // Streaming chat so'rovi. onChunk(content: string) har bir parcha
 *   // uchun chaqiriladi. Qaytaradi: { tokensUsed }.
 *   async chatStream(client, { model, prompt, maxTokens, onChunk }): Promise<{tokensUsed}>,
 * }
 */

module.exports = {}; // faqat hujjat — hech narsa eksport qilmaydi
