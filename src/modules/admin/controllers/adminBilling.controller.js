const SystemConfig = require("../../../models/SystemConfig");
const logger = require("../../../utils/logger");
const { getBillingStatus, isStripeKeyConfigured } = require("../../../config/stripe");

/**
 * Admin panel uchun billing (Stripe) holati va sozlamalari.
 * Bu yerda API kaliti hech qachon qaytarilmaydi — faqat "bormi/yo'qmi"
 * degan boolean, xavfsizlik uchun.
 */
exports.getBillingConfig = async (req, res) => {
  try {
    const status = await getBillingStatus();
    res.json(status);
  } catch (error) {
    logger.error("Get billing config error:", error);
    res.status(500).json({ error: "Billing konfiguratsiyasini olishda xatolik" });
  }
};

/**
 * Billing feature-flag'ini yoqish/o'chirish.
 *
 * ILGARI bu endpoint tariflarni ham (`plans`) shu yerda saqlar edi —
 * endi tariflar to'liq Plan modeliga ko'chirildi
 * (POST/PUT/DELETE /api/v1/admin/plans), shuning uchun bu yerda faqat
 * `enabled` feature-flag qoldi.
 *
 * MUHIM: enabled=true qilib qo'yish billing'ni haqiqatda yoqmaydi, agar
 * STRIPE_SECRET_KEY environment o'zgaruvchisi berilmagan bo'lsa — bu
 * holatni admin panelga aniq ko'rsatamiz (effectivelyActive: false),
 * shunda admin API kalit yo'qligini bilib, ataylab shunday qoldirishi
 * yoki keyinroq kalit qo'shilgach faollashtirishi mumkin bo'ladi.
 */
exports.updateBillingConfig = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (enabled === undefined || typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled (boolean) talab qilinadi" });
    }

    const existing = (await SystemConfig.getConfig("billing")) || {};
    const updated = { ...existing, enabled };

    await SystemConfig.setConfig("billing", updated, "To'lov tizimi (Stripe) feature-flag");

    logger.info(`Admin ${req.user._id} updated billing config: enabled=${updated.enabled}`);

    if (updated.enabled && !isStripeKeyConfigured()) {
      logger.warn(
        "Billing admin panelda yoqildi, lekin STRIPE_SECRET_KEY sozlanmagan — amalda hali ishlamaydi"
      );
    }

    const status = await getBillingStatus();
    res.json({ message: "Billing konfiguratsiyasi yangilandi", ...status });
  } catch (error) {
    logger.error("Update billing config error:", error);
    res.status(500).json({ error: "Billing konfiguratsiyasini yangilashda xatolik" });
  }
};
