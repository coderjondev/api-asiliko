const mongoose = require("mongoose");

const aiModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    modelId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["deepseek", "gemini", "openai", "anthropic", "openrouter", "groq", "mistral"],
    },
    description: {
      type: String,
      trim: true,
    },
    pricing: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    limits: {
      maxTokens: { type: Number, default: 4096 },
      maxContextLength: { type: Number, default: 128000 },
      rpm: { type: Number, default: 60 },
      tpm: { type: Number, default: 100000 },
    },
    features: {
      streaming: { type: Boolean, default: true },
      functionCalling: { type: Boolean, default: false },
      vision: { type: Boolean, default: false },
      webSearch: { type: Boolean, default: false },
    },
    tierAccess: {
      free: { type: Boolean, default: false },
      pro: { type: Boolean, default: true },
      enterprise: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    usage: {
      totalRequests: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
      lastUsed: Date,
    },
  },
  {
    timestamps: true,
  }
);

aiModelSchema.index({ provider: 1, isActive: 1 });
aiModelSchema.index({ isDefault: 1 });

module.exports = mongoose.model("AIModel", aiModelSchema);
