const billingService = require("./billing.service");
const { getStripeClient } = require("../../config/stripe");
const logger = require("../../utils/logger");

/**
 * Billing bilan bog'liq xatolarni bir xil formatda qaytaradigan yordamchi.
 * BillingDisabledError va boshqa aniq statusCode'li xatolar uchun mos
 * status kod ishlatiladi, qolganlari uchun 500.
 */
const handleBillingError = (res, error, logPrefix) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  logger.error(`${logPrefix}:`, error);
  res.status(500).json({ error: "To'lov tizimida xatolik yuz berdi" });
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { tier, successUrl, cancelUrl } = req.body;

    // ILGARI faqat "pro"/"enterprise" qattiq ro'yxati bilan tekshirilar
    // edi. Endi tier — admin panelda yaratilgan istalgan Plan.slug
    // bo'lishi mumkin, shuning uchun bu yerda faqat "berilganmi" deb
    // tekshiramiz; haqiqiy mavjudligini billing.service.js dagi
    // getPlanForCheckout() DB'dan tekshiradi (404/400 bilan).
    if (!tier || typeof tier !== "string") {
      return res.status(400).json({ error: "tier (tarif slug'i) talab qilinadi" });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: "successUrl va cancelUrl talab qilinadi" });
    }

    const result = await billingService.createCheckoutSession({
      user: req.user,
      tier,
      successUrl,
      cancelUrl,
    });

    res.json(result);
  } catch (error) {
    handleBillingError(res, error, "Create checkout session error");
  }
};

exports.createPortalSession = async (req, res) => {
  try {
    const { returnUrl } = req.body;
    if (!returnUrl) {
      return res.status(400).json({ error: "returnUrl talab qilinadi" });
    }

    const result = await billingService.createPortalSession({
      user: req.user,
      returnUrl,
    });

    res.json(result);
  } catch (error) {
    handleBillingError(res, error, "Create portal session error");
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const status = await billingService.getSubscriptionStatus(req.userId);
    res.json(status);
  } catch (error) {
    handleBillingError(res, error, "Get subscription status error");
  }
};

/**
 * Stripe webhook endpoint. MUHIM: bu route'da express.json() emas,
 * express.raw() ishlatilishi shart — Stripe signature tekshiruvi
 * so'rovning xom (parse qilinmagan) tanasiga bog'liq. Buni
 * billing.routes.js da alohida middleware sifatida ta'minlaymiz.
 */
exports.handleWebhook = async (req, res) => {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    logger.warn("Stripe webhook chaqirildi, lekin Stripe/webhook secret sozlanmagan");
    return res.status(503).json({ error: "Webhook sozlanmagan" });
  }

  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    logger.warn("Stripe webhook signature tekshiruvi muvaffaqiyatsiz:", error.message);
    return res.status(400).json({ error: `Webhook signature xato: ${error.message}` });
  }

  try {
    await billingService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    logger.error("Webhook event qayta ishlashda xatolik:", error);
    // Stripe muvaffaqiyatsiz javobni qayta urinadi — shuning uchun 500
    // qaytarish to'g'ri (Stripe keyinroq qayta yuboradi).
    res.status(500).json({ error: "Webhook qayta ishlashda xatolik" });
  }
};
