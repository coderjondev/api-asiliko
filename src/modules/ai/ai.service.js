const aiConfig = require("../../config/ai");
const Prompt = require("../../models/Prompt");
const User = require("../../models/User");
const logger = require("../../utils/logger");
const crypto = require("crypto");
const { getRedis } = require("../../config/redis");

class AIService {
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

      const selectedProvider = provider || aiConfig.getDefaultProvider();
      const selectedModel = model || aiConfig.getProviderConfig(selectedProvider).model;

      // Check cache first
      if (useCache) {
        const cached = await this.getCachedResponse(prompt, selectedProvider, selectedModel);
        if (cached) {
          return {
            ...cached,
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

      const aiProvider = aiConfig.getProvider(selectedProvider);
      const providerConfig = aiConfig.getProviderConfig(selectedProvider);

      let response;
      let tokensUsed = { input: 0, output: 0, total: 0 };

      if (selectedProvider === "deepseek") {
        const completion = await aiProvider.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "user", content: prompt }],
          max_tokens: providerConfig.maxTokens || quota.maxTokens,
          stream: false,
        });

        response = completion.choices[0].message.content;
        tokensUsed = {
          input: completion.usage?.prompt_tokens || 0,
          output: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        };
      } else if (selectedProvider === "gemini") {
        const geminiModel = aiProvider.getGenerativeModel({
          model: selectedModel,
        });
        const result = await geminiModel.generateContent(prompt);
        response = result.response.text();
        tokensUsed = {
          input: result.response.usageMetadata?.promptTokenCount || 0,
          output: result.response.usageMetadata?.candidatesTokenCount || 0,
          total: result.response.usageMetadata?.totalTokenCount || 0,
        };
      }

      await Prompt.create({
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

      const selectedProvider = provider || aiConfig.getDefaultProvider();
      const selectedModel = model || aiConfig.getProviderConfig(selectedProvider).model;
      const aiProvider = aiConfig.getProvider(selectedProvider);
      const providerConfig = aiConfig.getProviderConfig(selectedProvider);

      let fullResponse = "";
      let tokensUsed = { input: 0, output: 0, total: 0 };

      if (selectedProvider === "deepseek") {
        const stream = await aiProvider.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "user", content: prompt }],
          max_tokens: providerConfig.maxTokens || quota.maxTokens,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            onChunk({ type: "chunk", content });
          }

          if (chunk.usage) {
            tokensUsed = {
              input: chunk.usage.prompt_tokens || 0,
              output: chunk.usage.completion_tokens || 0,
              total: chunk.usage.total_tokens || 0,
            };
          }
        }
      } else if (selectedProvider === "gemini") {
        const geminiModel = aiProvider.getGenerativeModel({
          model: selectedModel,
        });
        const result = await geminiModel.generateContentStream(prompt);

        for await (const chunk of result.stream) {
          const content = chunk.text();
          if (content) {
            fullResponse += content;
            onChunk({ type: "chunk", content });
          }
        }

        const finalResult = await result.response;
        tokensUsed = {
          input: finalResult.usageMetadata?.promptTokenCount || 0,
          output: finalResult.usageMetadata?.candidatesTokenCount || 0,
          total: finalResult.usageMetadata?.totalTokenCount || 0,
        };
      }

      await Prompt.create({
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
}

module.exports = new AIService();
