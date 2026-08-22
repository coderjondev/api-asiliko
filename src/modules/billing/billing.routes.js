const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const billingController = require("./billing.controller");

// Eslatma: /webhook endpointi bu yerda emas, app.js'da to'g'ridan-to'g'ri
// ro'yxatga olingan — chunki u global express.json() middleware'dan OLDIN,
// express.raw() bilan ulanishi kerak (Stripe signature tekshiruvi uchun).
// Agar shu yerda ham qo'shilsa, Express ikkala handler'ni ham chaqirishga
// urinib, chalkashlik yaratardi.

/**
 * @openapi
 * /api/v1/billing/checkout:
 *   post:
 *     tags: [Billing]
 *     summary: Stripe Checkout session yaratish (obuna sotib olish)
 *     description: >
 *       Billing feature-flag admin panelda o'chirilgan yoki
 *       STRIPE_SECRET_KEY sozlanmagan bo'lsa 503 qaytaradi.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier, successUrl, cancelUrl]
 *             properties:
 *               tier: { type: string, enum: [pro, enterprise] }
 *               successUrl: { type: string, format: uri }
 *               cancelUrl: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Checkout URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkoutUrl: { type: string }
 *                 sessionId: { type: string }
 *       400: { description: "Noto'g'ri tier yoki URL" }
 *       503: { description: "To'lov tizimi o'chirilgan" }
 */
router.post("/checkout", auth, billingController.createCheckoutSession);

/**
 * @openapi
 * /api/v1/billing/portal:
 *   post:
 *     tags: [Billing]
 *     summary: Stripe Customer Portal session yaratish (obunani boshqarish)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [returnUrl]
 *             properties:
 *               returnUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Portal URL }
 *       404: { description: "Stripe mijoz topilmadi (hali obuna bo'lmagan)" }
 *       503: { description: "To'lov tizimi o'chirilgan" }
 */
router.post("/portal", auth, billingController.createPortalSession);

/**
 * @openapi
 * /api/v1/billing/subscription:
 *   get:
 *     tags: [Billing]
 *     summary: Joriy foydalanuvchining obuna holati
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Obuna holati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tier: { type: string, enum: [free, pro, enterprise] }
 *                 status: { type: string }
 *                 currentPeriodEnd: { type: string, format: date-time }
 *                 cancelAtPeriodEnd: { type: boolean }
 */
router.get("/subscription", auth, billingController.getSubscriptionStatus);

module.exports = router;
