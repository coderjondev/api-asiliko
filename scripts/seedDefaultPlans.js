/**
 * Boshlang'ich tariflarni (Plan) bazaga yozish uchun bir martalik skript.
 *
 * Yangi deploy qilingan tizimda hech qanday Plan hujjati mavjud emas —
 * bu esa yangi ro'yxatdan o'tgan foydalanuvchilar uchun "tier=free"
 * qiymati mavjud Plan'ga ishora qilmasligini anglatadi (billing.service.js
 * getSubscriptionStatus buni to'g'ri boshqaradi — plan: null qaytaradi —
 * lekin baribir kamida bitta "free" tarif borligi tavsiya etiladi).
 *
 * Bu skript FAQAT boshlang'ich nuqta — yaratilgandan keyin barcha
 * tahrirlash admin panel orqali (POST/PUT/DELETE /api/v1/admin/plans)
 * qilinishi kerak. Skript "free" slug allaqachon mavjud bo'lsa, uni
 * qayta yaratmaydi (idempotent).
 *
 * Foydalanish:
 *   node scripts/seedDefaultPlans.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Plan = require("../src/models/Plan");

const DEFAULT_PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "Boshlash uchun bepul tarif",
    price: { amount: 0, currency: "USD", interval: "month" },
    features: ["Kuniga 50 ta so'rov", "Asosiy AI modellar", "Email qo'llab-quvvatlash"],
    limits: {
      dailyRequests: 50,
      monthlyRequests: 1000,
      maxTokensPerRequest: 4096,
      rateLimitPerMinute: 5,
      maxFileUploadsPerMonth: 5,
      maxWebhooks: 1,
      maxApiKeys: 1,
    },
    isActive: true,
    isDefault: true,
    sortOrder: 0,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Faol foydalanuvchilar uchun",
    price: { amount: 19.99, currency: "USD", interval: "month" },
    features: [
      "Kuniga 1000 ta so'rov",
      "Barcha AI modellar",
      "Ustuvor qo'llab-quvvatlash",
      "Webhook integratsiyasi",
    ],
    limits: {
      dailyRequests: 1000,
      monthlyRequests: 25000,
      maxTokensPerRequest: 8192,
      rateLimitPerMinute: 30,
      maxFileUploadsPerMonth: 100,
      maxWebhooks: 5,
      maxApiKeys: 5,
    },
    isActive: true,
    isDefault: false,
    sortOrder: 1,
    // stripePriceId — admin panel orqali (yoki bu yerda qo'lda) haqiqiy
    // Stripe price ID bilan to'ldirilishi kerak, aks holda checkout
    // ishlamaydi (billing.service.js 400 xato qaytaradi).
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "Katta jamoalar va yuqori hajm uchun",
    price: { amount: 99.99, currency: "USD", interval: "month" },
    features: [
      "Cheksiz so'rovlar",
      "Barcha AI modellar",
      "Shaxsiy qo'llab-quvvatlash",
      "SLA kafolati",
      "Maxsus integratsiyalar",
    ],
    limits: {
      dailyRequests: -1, // -1 = cheksiz
      monthlyRequests: -1,
      maxTokensPerRequest: 32768,
      rateLimitPerMinute: 120,
      maxFileUploadsPerMonth: -1,
      maxWebhooks: 20,
      maxApiKeys: 20,
    },
    isActive: true,
    isDefault: false,
    sortOrder: 2,
  },
];

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI environment o'zgaruvchisi topilmadi (.env faylini tekshiring)");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB ga ulandi");

  for (const planData of DEFAULT_PLANS) {
    const existing = await Plan.findOne({ slug: planData.slug });
    if (existing) {
      console.log(`⏭  "${planData.slug}" allaqachon mavjud, o'tkazib yuborildi`);
      continue;
    }

    await Plan.create(planData);
    console.log(`✅ "${planData.slug}" (${planData.name}) yaratildi`);
  }

  console.log("\nTayyor. Tariflarni admin panel orqali (/api/v1/admin/plans) tahrirlashingiz mumkin.");
  console.log("Eslatma: 'pro' va 'enterprise' uchun stripePriceId hali bo'sh — Stripe checkout ishlashi uchun buni to'ldiring.");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("Xatolik:", error.message);
  process.exit(1);
});
