/**
 * Permission-based admin ruxsat tizimi.
 *
 * Oddiy "admin"/"user" role'idan farqli o'laroq, har bir admin
 * foydalanuvchiga alohida ruxsatlar (permissions) to'plami beriladi.
 * Bu orqali masalan "faqat AI modellarni boshqaradigan admin" yoki
 * "faqat foydalanuvchilarni ko'radigan support xodimi" kabi turli
 * darajadagi adminlarni yaratish mumkin bo'ladi.
 *
 * PERMISSIONS — tizimda mavjud barcha ruxsat kodlari.
 * Har biri "resurs:amal" formatida.
 */
const PERMISSIONS = Object.freeze({
  // Foydalanuvchilarni boshqarish
  USERS_READ: "users:read",
  USERS_WRITE: "users:write", // tier o'zgartirish, faollashtirish/o'chirish
  USERS_DELETE: "users:delete",

  // AI provider/model boshqaruvi
  MODELS_READ: "models:read",
  MODELS_WRITE: "models:write", // yaratish/tahrirlash/o'chirish/yoqish-o'chirish

  // Tizim statistikasi va so'rov loglari
  STATS_READ: "stats:read",
  LOGS_READ: "logs:read",

  // To'lov tizimi (Stripe) boshqaruvi — feature-flag, webhook holati
  BILLING_READ: "billing:read",
  BILLING_WRITE: "billing:write",

  // Tariflar (Plan) CRUD — narx, limitlar, marketing features
  PLANS_READ: "plans:read",
  PLANS_WRITE: "plans:write",

  // Analitika (revenue, MRR, churn, foydalanuvchi o'sishi va h.k.)
  ANALYTICS_READ: "analytics:read",

  // Admin foydalanuvchilarni va ularning ruxsatlarini boshqarish
  ADMINS_READ: "admins:read",
  ADMINS_WRITE: "admins:write", // yangi admin tayinlash, ruxsat berish/olib tashlash

  // Tizim konfiguratsiyasi (SystemConfig — AI provayder kalitlari, kvotalar)
  SYSTEM_CONFIG_READ: "system_config:read",
  SYSTEM_CONFIG_WRITE: "system_config:write",
});

// Barcha permissionlar ro'yxati — validatsiya va super-admin uchun
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Tayyor rol shablonlari (presets) — admin yaratishda tezkor tanlov
 * uchun. Bular User.permissions massivini to'ldirishda boshlang'ich
 * qiymat sifatida ishlatiladi, lekin keyinchalik har bir admin uchun
 * individual ravishda o'zgartirilishi mumkin (chinakam permission-based
 * — presetlar shunchaki qulaylik uchun, tizim ularga bog'liq emas).
 */
const ROLE_PRESETS = Object.freeze({
  // Barcha ruxsatlarga ega — birinchi admin shu bilan yaratiladi
  super_admin: ALL_PERMISSIONS,

  // Faqat AI model/provider boshqaruvi
  model_manager: [PERMISSIONS.MODELS_READ, PERMISSIONS.MODELS_WRITE, PERMISSIONS.STATS_READ],

  // Faqat foydalanuvchilar bilan ishlash (support)
  support: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.LOGS_READ],

  // Faqat ko'rish huquqi — statistikani kuzatib borish uchun
  viewer: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.MODELS_READ,
    PERMISSIONS.STATS_READ,
    PERMISSIONS.LOGS_READ,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.PLANS_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],

  // To'lov tizimini boshqaruvchi (Stripe feature-flag + tariflar)
  billing_manager: [
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_WRITE,
    PERMISSIONS.PLANS_READ,
    PERMISSIONS.PLANS_WRITE,
    PERMISSIONS.STATS_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],
});

module.exports = { PERMISSIONS, ALL_PERMISSIONS, ROLE_PRESETS };
