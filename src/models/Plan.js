const mongoose = require("mongoose");

/**
 * To'lov tarifi (Plan). Ilgari User.tier faqat "free"|"pro"|"enterprise"
 * degan qattiq enum edi va tarif tafsilotlari (narx, limitlar,
 * imkoniyatlar) hech qayerda saqlanmas, kodda hardcoded edi. Endi admin
 * panel orqali istalgan sondagi tarif yaratish, tahrirlash, o'chirish
 * mumkin — "free"/"pro"/"enterprise" endi shunchaki uchta boshlang'ich
 * yozuv, qattiq kod emas.
 *
 * `slug` — barqaror identifikator (User.planSlug, AIModel.tierAccess va
 * boshqa joylarda shu bilan bog'lanadi). Slug o'zgarmas bo'lishi kerak;
 * ko'rinadigan nomni istalgancha o'zgartirish mumkin.
 */
const planSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_-]+$/, // faqat kichik harf, raqam, tire, pastki chiziq
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      amount: { type: Number, required: true, min: 0 }, // eng kichik pul birligida emas, oddiy dollar/so'm sonida (masalan 29.99)
      currency: { type: String, default: "USD" },
      interval: {
        type: String,
        enum: ["month", "year", "one_time"],
        default: "month",
      },
    },
    // Marketing uchun ko'rinadigan xususiyatlar ro'yxati (frontend'da
    // checkbox/tick ro'yxati sifatida ko'rsatiladi). Erkin matn —
    // admin xohlagan narsani yoza oladi.
    features: {
      type: [String],
      default: [],
    },
    // Haqiqiy texnik limitlar — quota middleware va AI service shu
    // qiymatlarni o'qiydi (avval kodda hardcoded bo'lgan joylar).
    limits: {
      dailyRequests: { type: Number, default: 50 }, // -1 = cheksiz
      monthlyRequests: { type: Number, default: 1000 }, // -1 = cheksiz
      maxTokensPerRequest: { type: Number, default: 4096 },
      rateLimitPerMinute: { type: Number, default: 10 },
      maxFileUploadsPerMonth: { type: Number, default: 10 },
      maxWebhooks: { type: Number, default: 1 },
      maxApiKeys: { type: Number, default: 2 },
    },
    stripePriceId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true, // false bo'lsa yangi obuna uchun tanlab bo'lmaydi, lekin mavjud obunachilar davom etadi
    },
    isDefault: {
      type: Boolean,
      default: false, // yangi ro'yxatdan o'tgan foydalanuvchi avtomatik shu tarifga tushadi (odatda "free")
    },
    sortOrder: {
      type: Number,
      default: 0, // frontend'da tariflarni tartib bilan ko'rsatish uchun
    },
  },
  {
    timestamps: true,
  }
);

// Faqat bitta plan isDefault=true bo'lishi mumkin — pre-save hook orqali
// ta'minlaymiz (Mongoose partial unique index bilan ham qilish mumkin,
// lekin hook orqali xato xabari aniqroq bo'ladi).
planSchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model("Plan", planSchema);
