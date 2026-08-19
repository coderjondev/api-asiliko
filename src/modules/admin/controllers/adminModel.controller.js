const AIModel = require("../../models/AIModel");
const logger = require("../../utils/logger");

exports.listModels = async (req, res) => {
  try {
    const { provider, isActive, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (provider) filter.provider = provider;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const models = await AIModel.find(filter)
      .sort({ isDefault: -1, provider: 1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await AIModel.countDocuments(filter);

    res.json({
      models,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error("List models error:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

exports.createModel = async (req, res) => {
  try {
    const modelData = req.body;

    if (modelData.isDefault) {
      await AIModel.updateMany(
        { provider: modelData.provider, isDefault: true },
        { isDefault: false }
      );
    }

    const model = await AIModel.create(modelData);

    logger.info(`Admin ${req.user.userId} created model ${model.modelId}`);
    res.status(201).json(model);
  } catch (error) {
    logger.error("Create model error:", error);
    res.status(500).json({ error: "Failed to create model" });
  }
};

exports.updateModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    const updates = req.body;

    if (updates.isDefault) {
      const model = await AIModel.findOne({ modelId });
      if (model) {
        await AIModel.updateMany(
          { provider: model.provider, isDefault: true, modelId: { $ne: modelId } },
          { isDefault: false }
        );
      }
    }

    const model = await AIModel.findOneAndUpdate({ modelId }, updates, { new: true });

    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    logger.info(`Admin ${req.user.userId} updated model ${modelId}`);
    res.json(model);
  } catch (error) {
    logger.error("Update model error:", error);
    res.status(500).json({ error: "Failed to update model" });
  }
};

exports.deleteModel = async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await AIModel.findOneAndDelete({ modelId });

    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    logger.info(`Admin ${req.user.userId} deleted model ${modelId}`);
    res.json({ message: "Model deleted successfully" });
  } catch (error) {
    logger.error("Delete model error:", error);
    res.status(500).json({ error: "Failed to delete model" });
  }
};

exports.toggleModelStatus = async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await AIModel.findOne({ modelId });

    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    model.isActive = !model.isActive;
    await model.save();

    logger.info(`Admin ${req.user.userId} ${model.isActive ? "enabled" : "disabled"} model ${modelId}`);
    res.json(model);
  } catch (error) {
    logger.error("Toggle model status error:", error);
    res.status(500).json({ error: "Failed to toggle model status" });
  }
};

exports.getModelStats = async (req, res) => {
  try {
    const stats = await AIModel.aggregate([
      {
        $group: {
          _id: "$provider",
          totalModels: { $sum: 1 },
          activeModels: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
          totalRequests: { $sum: "$usage.totalRequests" },
          totalTokens: { $sum: "$usage.totalTokens" },
        },
      },
    ]);

    const totalStats = await AIModel.aggregate([
      {
        $group: {
          _id: null,
          totalModels: { $sum: 1 },
          activeModels: { $sum: { $cond: ["$isActive", 1, 0] } },
          totalRequests: { $sum: "$usage.totalRequests" },
          totalTokens: { $sum: "$usage.totalTokens" },
        },
      },
    ]);

    res.json({
      byProvider: stats,
      overall: totalStats[0] || { totalModels: 0, activeModels: 0, totalRequests: 0, totalTokens: 0 },
    });
  } catch (error) {
    logger.error("Get model stats error:", error);
    res.status(500).json({ error: "Failed to fetch model stats" });
  }
};

exports.seedDefaultModels = async (req, res) => {
  try {
    const defaultModels = [
      {
        name: "DeepSeek V4 Pro",
        modelId: "deepseek-v4-pro",
        provider: "deepseek",
        description: "Most capable DeepSeek model with advanced reasoning",
        pricing: { input: 0.5, output: 2.0 },
        limits: { maxTokens: 8192, maxContextLength: 128000 },
        features: { streaming: true, functionCalling: true },
        tierAccess: { free: true, pro: true, enterprise: true },
        isDefault: true,
      },
      {
        name: "Gemini 2.0 Flash",
        modelId: "gemini-2.0-flash-exp",
        provider: "gemini",
        description: "Fast and efficient Gemini model",
        pricing: { input: 0.1, output: 0.5 },
        limits: { maxTokens: 8192, maxContextLength: 1000000 },
        features: { streaming: true, vision: true },
        tierAccess: { free: true, pro: true, enterprise: true },
        isDefault: true,
      },
      {
        name: "GPT-4o",
        modelId: "gpt-4o",
        provider: "openai",
        description: "OpenAI's most advanced multimodal model",
        pricing: { input: 2.5, output: 10.0 },
        limits: { maxTokens: 4096, maxContextLength: 128000 },
        features: { streaming: true, functionCalling: true, vision: true },
        tierAccess: { free: false, pro: true, enterprise: true },
      },
      {
        name: "Claude 3.5 Sonnet",
        modelId: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        description: "Anthropic's most intelligent model",
        pricing: { input: 3.0, output: 15.0 },
        limits: { maxTokens: 8192, maxContextLength: 200000 },
        features: { streaming: true, functionCalling: true },
        tierAccess: { free: false, pro: true, enterprise: true },
      },
    ];

    const results = [];
    for (const modelData of defaultModels) {
      const existing = await AIModel.findOne({ modelId: modelData.modelId });
      if (!existing) {
        const model = await AIModel.create(modelData);
        results.push(model);
      }
    }

    logger.info(`Admin ${req.user.userId} seeded ${results.length} default models`);
    res.json({
      message: `Successfully seeded ${results.length} models`,
      models: results,
    });
  } catch (error) {
    logger.error("Seed models error:", error);
    res.status(500).json({ error: "Failed to seed models" });
  }
};
