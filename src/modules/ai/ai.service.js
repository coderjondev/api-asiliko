const aiConfig = require("../../config/ai");
const Prompt = require("../../models/Prompt");
const User = require("../../models/User");
const logger = require("../../utils/logger");

class AIService {
  async chat(userId, { prompt, provider, model, stream = false }) {
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
      const aiProvider = aiConfig.getProvider(selectedProvider);
      const providerConfig = aiConfig.getProviderConfig(selectedProvider);

      let response;
      let tokensUsed = { input: 0, output: 0, total: 0 };

      if (selectedProvider === "deepseek") {
        const completion = await aiProvider.chat.completions.create({
          model: model || providerConfig.model,
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
          model: model || providerConfig.model,
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
        model: model || providerConfig.model,
        tokensUsed,
      });

      user.usage.daily += 1;
      await user.save();

      return {
        response,
        provider: selectedProvider,
        model: model || providerConfig.model,
        tokensUsed,
        usage: {
          daily: user.usage.daily,
          dailyLimit: quota.daily,
        },
      };
    } catch (error) {
      logger.error("AI chat xatosi:", error.message);
      throw error;
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
