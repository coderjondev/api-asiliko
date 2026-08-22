const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Permission-based ruxsat tizimi: faqat role === "admin" bo'lgan
    // foydalanuvchilar uchun mazmunli. Har bir admin uchun alohida
    // ruxsatlar to'plami — bitta "admin" roli o'rniga moslashuvchan
    // nazorat imkonini beradi (masalan faqat AI modellarni boshqaradigan
    // admin, faqat foydalanuvchilar bilan ishlaydigan support va h.k.).
    // Ruxsat kodlari uchun src/constants/roles.js (PERMISSIONS) ga qarang.
    permissions: {
      type: [String],
      default: [],
    },
    // Foydalanuvchining joriy tarifi — Plan.slug ga ishora qiladi
    // (masalan "free", "pro", yoki admin yaratgan istalgan boshqa slug).
    // ILGARI bu maydon enum: ["free", "pro", "enterprise"] edi — ya'ni
    // faqat shu uchta qattiq yozilgan tarif bo'lishi mumkin edi. Endi
    // admin panel orqali istalgan sondagi tarif (Plan hujjati)
    // yaratilishi mumkin bo'lgani uchun bu maydon oddiy String qilindi.
    // Haqiqiy Plan hujjati mavjudligini bilish uchun Plan.findOne({slug: tier})
    // so'raladi — referential integrity DB darajasida emas, service
    // darajasida (billing.service.js) ta'minlanadi.
    tier: {
      type: String,
      default: "free",
      trim: true,
      lowercase: true,
    },
    // Foydalanuvchi tanlagan interfeys/API xabarlar tili. i18n
    // middleware (src/middlewares/i18n.js) bu qiymatni Accept-Language
    // headerdan ustunroq, lekin ?lang= query'dan pastroq ustuvorlikda
    // ishlatadi.
    language: {
      type: String,
      default: "en",
      trim: true,
      lowercase: true,
    },
    apiKeys: [
      {
        key: String,
        name: String,
        createdAt: { type: Date, default: Date.now },
        lastUsed: Date,
        isActive: { type: Boolean, default: true },
      },
    ],
    usage: {
      daily: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Foydalanuvchi (admin) berilgan ruxsatga ega ekanligini tekshiradi.
 * role !== "admin" bo'lsa har doim false qaytaradi — oddiy foydalanuvchilar
 * permissions massividan qat'iy nazar admin amallariga kira olmaydi.
 */
userSchema.methods.hasPermission = function (permission) {
  if (this.role !== "admin") return false;
  return this.permissions.includes(permission);
};

/**
 * Bir nechta ruxsatning barchasiga ega ekanligini tekshiradi.
 */
userSchema.methods.hasAllPermissions = function (permissionList) {
  if (this.role !== "admin") return false;
  return permissionList.every((p) => this.permissions.includes(p));
};

/**
 * Bir nechta ruxsatdan kamida bittasiga ega ekanligini tekshiradi.
 */
userSchema.methods.hasAnyPermission = function (permissionList) {
  if (this.role !== "admin") return false;
  return permissionList.some((p) => this.permissions.includes(p));
};

module.exports = mongoose.model("User", userSchema);
