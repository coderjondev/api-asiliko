const Stripe = require("stripe");
const SystemConfig = require("../models/SystemConfig");
const logger = require("../utils/logger");

/**
 * To'lov tizimi (Stripe) konfiguratsiyasi.
 *
 * Feature-flag orqali boshqariladi: SystemConfig("billing").enabled.
 * Bu flag admin panel orqali (PUT /api/v1/admin/billing/config) o'zgartiriladi.
 *
 * Nega feature-flag kerak: hozircha haqiqiy Stripe API kaliti yo'q
 * (STRIPE_SECRET_KEY environment o'zgaruvchisi berilmagan), shuning uchun
 * kod to'liq yozilgan, lekin admin uni ataylab "disabled" holatda
 * qoldirishi mumkin — bu holatda checkout/billing endpointlari
 * 503 "billing xizmati o'chirilgan" javobini qaytaradi, server esa
 * hech qanday Stripe chaqiruviga urinmaydi.
 *
 * STRIPE_SECRET_KEY berilmagan bo'lsa, `enabled: true` qilib qo'yilgan
 * taqdirda ham tizim avtomatik ravishda "disabled" holatiga qaytadi —
 * ya'ni admin panel flagi ikkinchi darajali xavfsizlik pardasi, birinchi
 * shart har doim "API kalit mavjudmi" bo'lib qoladi.
 */

let stripeClient = null;

const isStripeKeyConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const initStripe = () => {
  if (!isStripeKeyConfigured()) {
    logger.warn("⚠️ STRIPE_SECRET_KEY topilmadi — to'lov tizimi API darajasida o'chirilgan");
    return;
  }

  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
    logger.info("✅ Stripe klienti ishga tushirildi");
  } catch (error) {
    logger.error("Stripe klientini ishga tushirishda xatolik:", error.message);
  }
};

const getStripeClient = () => stripeClient;

/**
 * Billing tizimi haqiqatan ishlatilishi mumkinmi — ikkala shart ham
 * bajarilishi kerak: (1) API kaliti berilgan VA (2) admin panelda
 * feature-flag yoqilgan.
 */
const isBillingActive = async () => {
  if (!isStripeKeyConfigured() || !stripeClient) {
    return false;
  }

  const config = await SystemConfig.getConfig("billing");
  return Boolean(config?.enabled);
};

/**
 * Admin panel uchun: billing konfiguratsiyasining joriy holatini qaytaradi
 * (API kalit mavjudligi + feature-flag holati + faol tariflar soni).
 *
 * ILGARI `plans` shu yerda SystemConfig ichida saqlanardi — endi
 * to'liq Plan modeliga ko'chirilgan (GET /api/v1/admin/plans orqali
 * olinadi), shuning uchun bu yerda faqat qisqacha son (activePlanCount)
 * ko'rsatiladi.
 */
const getBillingStatus = async () => {
  const config = (await SystemConfig.getConfig("billing")) || {};
  const Plan = require("../models/Plan");
  const activePlanCount = await Plan.countDocuments({ isActive: true });

  return {
    apiKeyConfigured: isStripeKeyConfigured(),
    enabled: Boolean(config.enabled),
    // enabled=true bo'lsa ham API kalit yo'q bo'lsa haqiqatda ishlamaydi —
    // buni alohida ko'rsatamiz, aks holda admin chalkashib qolishi mumkin.
    effectivelyActive: isStripeKeyConfigured() && Boolean(config.enabled),
    activePlanCount,
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  };
};

module.exports = {
  initStripe,
  getStripeClient,
  isStripeKeyConfigured,
  isBillingActive,
  getBillingStatus,
};
