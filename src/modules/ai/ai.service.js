const aiConfig = require("../../config/ai");
const Prompt = require("../../models/Prompt");
const User = require("../../models/User");
const AIModel = require("../../models/AIModel");
const logger = require("../../utils/logger");
const crypto = require("crypto");
const { getRedis } = require("../../config/redis");

/**
 * ILGARI: chat() va chatStream() ichida har bir provider uchun qattiq
 * yozilgan if/else if zanjiri bor edi (faqat "deepseek" va "gemini").
 * Boshqa provider (masalan "openai") kelsa, hech qanday branch mos
 * kelmasdi — response undefined qolib, funksiya XATO TASHLAMASDAN
 * muvaffaqiyatli qaytardi (jim ishlamay qolish bugi).
 *
 * ENDI: aiConfig.getAdapter(providerName) orqali mos adapter (registry.js)
 * olinadi va uning umumiy chat()/chatStream() interfeysi chaqiriladi.
 * Provider nomi bu faylda hech qayerda hardcoded emas — yangi provider
 * qo'shish uchun bu faylga tegish shart emas.
 */
class AIService {
  /**
   * Foydalanuvchi so'rovidan (prompt, provider?, model?) haqiqiy
   * provider va model nomini aniqlaydi.
   *
   * ILGARI: agar frontend faqat `model: "claude-haiku-4-5"` yuborib,
   * `provider`ni yubormasa, tizim har doim aiConfig.getDefaultProvider()
   * (masalan "deepseek") ni ishlatar edi — bu NOTO'G'RI, chunki
   * "claude-haiku-4-5" DeepSeek'da mavjud emas va so'rov xato beradi.
   *
   * ENDI: agar provider berilmagan bo'lsa-yu model berilgan bo'lsa,
   * AIModel kolleksiyasidan modelId orqali qidirib, unga tegishli
   * provider avtomatik topiladi. Faqat ikkalasi ham berilmagan taqdirda
   * default provider + uning default modeli ishlatiladi.
   */
  async resolveProviderAndModel({ provider, model }) {
    if (provider && model) {
      return { provider, model };
    }

    if (!provider && model) {
      // Model nomi berilgan, provider berilmagan — AIModel'dan qidiramiz.
      const modelDoc = await AIModel.findOne({ modelId: model, isActive: true });
      if (!modelDoc) {
        const err = new Error(
          `"${model}" nomli faol model topilmadi. Admin panelda mavjud modellarni GET /api/v1/admin/models orqali tekshiring.`
        );
        err.statusCode = 400;
        err.i18nKey = "ai.model_not_found";
        err.i18nParams = { model };
        throw err;
      }
      return { provider: modelDoc.provider, model };
    }

    if (provider && !model) {
      // Provider berilgan, model berilmagan — shu providerning
      // standart modelini (SystemConfig("ai").<provider>.model) olamiz.
      return { provider, model: aiConfig.getProviderConfig(provider).model };
    }

    // Ikkalasi ham berilmagan — to'liq standart qiymatlar.
    const defaultProvider = aiConfig.getDefaultProvider();
    return { provider: defaultProvider, model: aiConfig.getProviderConfig(defaultProvider).model };
  }

  generateCacheKey(prompt, provider, model) {
    const hash = crypto
      .createHash("sha256")
      .update(`${prompt}:${provider}:${model}`)
      .digest("hex");
    return `ai:cache:${hash}`;
  }

  async getCachedResponse(prompt, provider, model) {
    try {
      const redis = getRedis();
      if (!redis) return null;

      const cacheKey = this.generateCacheKey(prompt, provider, model);
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.info("Cache hit for AI request");
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error("Cache get error:", error.message);
      return null;
    }
  }

  async setCachedResponse(prompt, provider, model, data, ttl = 3600) {
    try {
      const redis = getRedis();
      if (!redis) return;

      const cacheKey = this.generateCacheKey(prompt, provider, model);
      await redis.setex(cacheKey, ttl, JSON.stringify(data));
      logger.info("Response cached successfully");
    } catch (error) {
      logger.error("Cache set error:", error.message);
    }
  }

  async chat(userId, { prompt, provider, model, stream = false, useCache = true }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Foydalanuvchi topilmadi");
      }

      const { provider: selectedProvider, model: selectedModel } =
        await this.resolveProviderAndModel({ provider, model });

      // Check cache first
      if (useCache) {
        const cached = await this.getCachedResponse(prompt, selectedProvider, selectedModel);
        if (cached) {
          // MUHIM: kesh faqat javob MATNINI saqlaydi, Prompt hujjatini
          // emas. Har bir "chat" chaqiruvi — foydalanuvchi uchun alohida
          // foydalanish holati (feedback/refresh shu holatga tegishli
          // bo'lishi kerak), shuning uchun keshdan kelgan taqdirda ham
          // YANGI Prompt hujjati yaratamiz — bu promptId feedback va
          // "refresh" uchun ishlatiladi.
          const promptDoc = await Prompt.create({
            userId,
            prompt,
            response: cached.response,
            provider: cached.provider,
            model: cached.model,
            tokensUsed: cached.tokensUsed,
          });

          return {
            ...cached,
            promptId: promptDoc._id,
            fromCache: true,
            usage: {
              daily: user.usage.daily,
              dailyLimit: await aiConfig.getQuota(user.tier).then(q => q.daily),
            },
          };
        }
      }

      const quota = await aiConfig.getQuota(user.tier);
      if (user.usage.daily >= quota.daily) {
        throw new Error("Kunlik limit tugadi");
      }

      const client = aiConfig.getProvider(selectedProvider);
      const providerConfig = aiConfig.getProviderConfig(selectedProvider);
      const adapter = aiConfig.getAdapter(selectedProvider);

      const { response, tokensUsed } = await adapter.chat(client, {
        model: selectedModel,
        prompt,
        maxTokens: providerConfig.maxTokens || quota.maxTokens,
      });

      const promptDoc = await Prompt.create({
        userId,
        prompt,
        response,
        provider: selectedProvider,
        model: selectedModel,
        tokensUsed,
      });

      user.usage.daily += 1;
      await user.save();

      const result = {
        response,
        promptId: promptDoc._id,
        provider: selectedProvider,
        model: selectedModel,
        tokensUsed,
        fromCache: false,
        usage: {
          daily: user.usage.daily,
          dailyLimit: quota.daily,
        },
      };

      // Cache the response
      if (useCache) {
        await this.setCachedResponse(prompt, selectedProvider, selectedModel, {
          response,
          provider: selectedProvider,
          model: selectedModel,
          tokensUsed,
        });
      }

      return result;
    } catch (error) {
      logger.error("AI chat xatosi:", error.message);
      throw error;
    }
  }

  async chatStream(userId, { prompt, provider, model, onChunk, onComplete, onError }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Foydalanuvchi topilmadi");
      }

      const quota = await aiConfig.getQuota(user.tier);
      if (user.usage.daily >= quota.daily) {
        throw new Error("Kunlik limit tugadi");
      }

      const { provider: selectedProvider, model: selectedModel } =
        await this.resolveProviderAndModel({ provider, model });
      const client = aiConfig.getProvider(selectedProvider);
      const providerConfig = aiConfig.getProviderConfig(selectedProvider);
      const adapter = aiConfig.getAdapter(selectedProvider);

      let fullResponse = "";

      const { tokensUsed } = await adapter.chatStream(client, {
        model: selectedModel,
        prompt,
        maxTokens: providerConfig.maxTokens || quota.maxTokens,
        onChunk: (content) => {
          fullResponse += content;
          onChunk({ type: "chunk", content });
        },
      });

      const promptDoc = await Prompt.create({
        userId,
        prompt,
        response: fullResponse,
        provider: selectedProvider,
        model: selectedModel,
        tokensUsed,
      });

      user.usage.daily += 1;
      await user.save();

      onComplete({
        promptId: promptDoc._id,
        provider: selectedProvider,
        model: selectedModel,
        tokensUsed,
        usage: {
          daily: user.usage.daily,
          dailyLimit: quota.daily,
        },
      });
    } catch (error) {
      logger.error("AI stream xatosi:", error.message);
      onError(error);
    }
  }

  async getHistory(userId, limit = 20) {
    return await Prompt.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-__v");
  }

  /**
   * Foydalanuvchi javobga baho beradi (OpenAI/Gemini/Claude uslubidagi
   * 👍/👎). Faqat javobning egasi (promptDoc.userId === userId) baho
   * berishi mumkin — boshqa foydalanuvchining suhbatiga aralashishning
   * oldini olish uchun.
   */
  async submitFeedback(userId, promptId, { rating, comment }) {
    if (!["good", "bad"].includes(rating)) {
      const err = new Error("rating 'good' yoki 'bad' bo'lishi kerak");
      err.statusCode = 400;
      err.i18nKey = "ai.feedback_invalid_rating";
      throw err;
    }

    const promptDoc = await Prompt.findOne({ _id: promptId, userId });

    if (!promptDoc) {
      const err = new Error("Javob topilmadi yoki sizga tegishli emas");
      err.statusCode = 404;
      err.i18nKey = "ai.feedback_not_found";
      throw err;
    }

    promptDoc.feedback = {
      rating,
      comment: comment || undefined,
      ratedAt: new Date(),
    };
    await promptDoc.save();

    return promptDoc;
  }

  /**
   * "Refresh" — foydalanuvchi javobni yoqtirmasa, xuddi shu promptni
   * (savolni) xuddi shu provider/model bilan qayta yuboradi va YANGI
   * Prompt hujjati yaratadi (eskisi o'zgarmaydi — tarix saqlanadi,
   * shu jumladan eski javobga berilgan feedback ham).
   *
   * useCache=false bilan chaqiriladi — aks holda kesh eski javobning
   * aynan o'zini qaytarib, "refresh" ma'nosiz bo'lib qolardi.
   */
  async regenerateResponse(userId, promptId) {
    const originalPrompt = await Prompt.findOne({ _id: promptId, userId });

    if (!originalPrompt) {
      const err = new Error("Asl javob topilmadi yoki sizga tegishli emas");
      err.statusCode = 404;
      err.i18nKey = "ai.regenerate_not_found";
      throw err;
    }

    return this.chat(userId, {
      prompt: originalPrompt.prompt,
      provider: originalPrompt.provider,
      model: originalPrompt.model,
      useCache: false,
    });
  }
}

module.exports = new AIService();
