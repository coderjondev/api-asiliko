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
    // ILGARI qattiq enum edi: ["deepseek", "gemini", "openai", "anthropic",
    // "openrouter", "groq", "mistral"] — bu ro'yxatda kod darajasida
    // adapter mavjud bo'lmagan nomlar ham bor edi (openrouter/groq/mistral),
    // ya'ni admin panelda model yaratish mumkin edi, lekin so'rov
    // yuborilganda ishlamas edi. Endi bu tekshiruv olib tashlandi —
    // haqiqiy validatsiya adminModel.controller.js da
    // providers/registry.js ga qarab amalga oshiriladi (yagona haqiqat
    // manbai). Bu yerda faqat "bo'sh emas" talab qilinadi.
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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
    // Bu model qaysi tarif(lar) uchun ochiq — Plan.slug kalitlari bilan.
    // ILGARI: { free: Boolean, pro: Boolean, enterprise: Boolean } deb
    // qattiq yozilgan edi, ya'ni faqat shu 3 ta tarif bilan ishlar edi.
    // Endi admin istalgan slug qo'shishi mumkin bo'lgani uchun Map
    // qilindi: masalan { free: false, pro: true, custom_plan: true }.
    // Bo'sh Map — hech qanday cheklov yo'q, hamma tarifga ochiq deb
    // talqin qilinadi (ai.service.js da shunday ishlatiladi).
    tierAccess: {
      type: Map,
      of: Boolean,
      default: {},
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
