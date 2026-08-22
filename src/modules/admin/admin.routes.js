const express = require("express");
const router = express.Router();
const { requirePermission } = require("../../middlewares/auth");
const { PERMISSIONS } = require("../../constants/roles");
const {
  getAIConfig,
  updateAIConfig,
  setDefaultProvider,
} = require("./controllers/adminAi.controller");
const {
  getSystemStats,
  getUsers,
  updateUserTier,
  toggleUserStatus,
  getRequestLogs,
} = require("./controllers/adminUser.controller");
const {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  toggleModelStatus,
  getModelStats,
  seedDefaultModels,
  listSupportedProviders,
} = require("./controllers/adminModel.controller");
const {
  listAdmins,
  grantAdmin,
  updateAdminPermissions,
  revokeAdmin,
} = require("./controllers/adminAuth.controller");
const {
  getBillingConfig,
  updateBillingConfig,
} = require("./controllers/adminBilling.controller");
const {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
} = require("./controllers/adminPlan.controller");
const {
  getRevenueAnalytics,
  getUsageAnalytics,
  getUserGrowthAnalytics,
  getModelCostAnalytics,
} = require("./controllers/adminAnalytics.controller");

// Barcha /api/v1/admin/* endpointlari JWT + tegishli permission talab
// qiladi (requirePermission middleware). Standart javoblar:
//   401 — token yo'q/yaroqsiz
//   403 — role !== "admin" YOKI kerakli permission yo'q
// Shu sababli har bir endpoint uchun bu ikkitasini alohida yozib
// o'tirmasdan, pastda umumiy responses komponenti sifatida eslatib
// o'tamiz.

/**
 * @openapi
 * /api/v1/admin/ai/config:
 *   get:
 *     tags: [Admin]
 *     summary: AI provayder konfiguratsiyasini olish (kalitlar yashiriladi)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: AI konfiguratsiya }
 *       401: { description: Autentifikatsiya talab qilinadi }
 *       403: { description: "system_config:read ruxsati yo'q" }
 *   put:
 *     tags: [Admin]
 *     summary: AI provayder konfiguratsiyasini yangilash
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Yangilandi }
 *       403: { description: "system_config:write ruxsati yo'q" }
 */
router.get("/ai/config", requirePermission(PERMISSIONS.SYSTEM_CONFIG_READ), getAIConfig);
router.put("/ai/config", requirePermission(PERMISSIONS.SYSTEM_CONFIG_WRITE), updateAIConfig);

/**
 * @openapi
 * /api/v1/admin/ai/default-provider:
 *   post:
 *     tags: [Admin]
 *     summary: Standart AI provayderni belgilash
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Standart provayder yangilandi }
 *       403: { description: "system_config:write ruxsati yo'q" }
 */
router.post(
  "/ai/default-provider",
  requirePermission(PERMISSIONS.SYSTEM_CONFIG_WRITE),
  setDefaultProvider
);

/**
 * @openapi
 * /api/v1/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Tizim statistikasi (foydalanuvchilar soni, so'rovlar va h.k.)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Statistika ma'lumotlari }
 *       403: { description: "stats:read ruxsati yo'q" }
 */
router.get("/stats", requirePermission(PERMISSIONS.STATS_READ), getSystemStats);

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha foydalanuvchilar ro'yxati
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Foydalanuvchilar ro'yxati }
 *       403: { description: "users:read ruxsati yo'q" }
 */
router.get("/users", requirePermission(PERMISSIONS.USERS_READ), getUsers);

/**
 * @openapi
 * /api/v1/admin/users/{userId}/tier:
 *   put:
 *     tags: [Admin]
 *     summary: Foydalanuvchi tarifini (free/pro/enterprise) o'zgartirish
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier]
 *             properties:
 *               tier: { type: string, enum: [free, pro, enterprise] }
 *     responses:
 *       200: { description: Tarif yangilandi }
 *       403: { description: "users:write ruxsati yo'q" }
 *       404: { description: Foydalanuvchi topilmadi }
 */
router.put("/users/:userId/tier", requirePermission(PERMISSIONS.USERS_WRITE), updateUserTier);

/**
 * @openapi
 * /api/v1/admin/users/{userId}/toggle:
 *   post:
 *     tags: [Admin]
 *     summary: Foydalanuvchini faollashtirish/bloklash
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Holat almashtirildi }
 *       403: { description: "users:write ruxsati yo'q" }
 */
router.post(
  "/users/:userId/toggle",
  requirePermission(PERMISSIONS.USERS_WRITE),
  toggleUserStatus
);

/**
 * @openapi
 * /api/v1/admin/logs:
 *   get:
 *     tags: [Admin]
 *     summary: So'rov loglarini ko'rish
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: So'rov loglari ro'yxati }
 *       403: { description: "logs:read ruxsati yo'q" }
 */
router.get("/logs", requirePermission(PERMISSIONS.LOGS_READ), getRequestLogs);

/**
 * @openapi
 * /api/v1/admin/models:
 *   get:
 *     tags: [Admin]
 *     summary: AI modellari ro'yxati
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Modellar ro'yxati }
 *       403: { description: "models:read ruxsati yo'q" }
 *   post:
 *     tags: [Admin]
 *     summary: Yangi AI model qo'shish
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, name, modelId]
 *             properties:
 *               provider: { type: string, example: "openai" }
 *               name: { type: string, example: "GPT-4o" }
 *               modelId: { type: string, example: "gpt-4o" }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201: { description: Model yaratildi }
 *       403: { description: "models:write ruxsati yo'q" }
 */
/**
 * @openapi
 * /api/v1/admin/models/supported-providers:
 *   get:
 *     tags: [Admin]
 *     summary: Kod darajasida qo'llab-quvvatlanadigan AI provider nomlari
 *     description: >
 *       Model qo'shish formasi uchun — faqat shu ro'yxatdagi provider
 *       nomlari bilan model yaratish mumkin (registry.js dagi adapterlar
 *       asosida).
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Qo'llab-quvvatlanadigan providerlar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["deepseek", "gemini", "openai", "anthropic"]
 *       403: { description: "models:read ruxsati yo'q" }
 */
router.get(
  "/models/supported-providers",
  requirePermission(PERMISSIONS.MODELS_READ),
  listSupportedProviders
);
router.get("/models", requirePermission(PERMISSIONS.MODELS_READ), listModels);
router.post("/models", requirePermission(PERMISSIONS.MODELS_WRITE), createModel);

/**
 * @openapi
 * /api/v1/admin/models/{modelId}:
 *   put:
 *     tags: [Admin]
 *     summary: AI modelni tahrirlash
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Model yangilandi }
 *       403: { description: "models:write ruxsati yo'q" }
 *       404: { description: Model topilmadi }
 *   delete:
 *     tags: [Admin]
 *     summary: AI modelni o'chirish
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Model o'chirildi }
 *       403: { description: "models:write ruxsati yo'q" }
 *       404: { description: Model topilmadi }
 */
router.put("/models/:modelId", requirePermission(PERMISSIONS.MODELS_WRITE), updateModel);
router.delete("/models/:modelId", requirePermission(PERMISSIONS.MODELS_WRITE), deleteModel);

/**
 * @openapi
 * /api/v1/admin/models/{modelId}/toggle:
 *   post:
 *     tags: [Admin]
 *     summary: Modelni yoqish/o'chirish
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Holat almashtirildi }
 *       403: { description: "models:write ruxsati yo'q" }
 */
router.post(
  "/models/:modelId/toggle",
  requirePermission(PERMISSIONS.MODELS_WRITE),
  toggleModelStatus
);

/**
 * @openapi
 * /api/v1/admin/models/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Model bo'yicha ishlatilish statistikasi
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Statistika }
 *       403: { description: "models:read ruxsati yo'q" }
 */
router.get("/models/stats", requirePermission(PERMISSIONS.MODELS_READ), getModelStats);

/**
 * @openapi
 * /api/v1/admin/models/seed:
 *   post:
 *     tags: [Admin]
 *     summary: Standart AI modellar ro'yxatini bazaga yozish (bir martalik)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Standart modellar yozildi }
 *       403: { description: "models:write ruxsati yo'q" }
 */
router.post("/models/seed", requirePermission(PERMISSIONS.MODELS_WRITE), seedDefaultModels);

/**
 * @openapi
 * /api/v1/admin/admins:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha admin foydalanuvchilar va ularning ruxsatlari
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Adminlar ro'yxati }
 *       403: { description: "admins:read ruxsati yo'q" }
 */
router.get("/admins", requirePermission(PERMISSIONS.ADMINS_READ), listAdmins);

/**
 * @openapi
 * /api/v1/admin/admins/grant:
 *   post:
 *     tags: [Admin]
 *     summary: Oddiy foydalanuvchini adminga aylantirish (ruxsatlar yoki preset bilan)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *               preset:
 *                 type: string
 *                 enum: [super_admin, model_manager, support, viewer, billing_manager]
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *                 description: preset o'rniga aniq ruxsatlar ro'yxati
 *     responses:
 *       200: { description: Admin huquqi berildi }
 *       400: { description: Noto'g'ri so'rov (userId/preset/permissions) }
 *       403: { description: "admins:write ruxsati yo'q" }
 *       404: { description: Foydalanuvchi topilmadi }
 */
router.post("/admins/grant", requirePermission(PERMISSIONS.ADMINS_WRITE), grantAdmin);

/**
 * @openapi
 * /api/v1/admin/admins/{userId}/permissions:
 *   put:
 *     tags: [Admin]
 *     summary: Adminning ruxsatlar to'plamini to'liq almashtirish
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Ruxsatlar yangilandi }
 *       400: { description: "Oxirgi admins:write egasidan olib tashlab bo'lmaydi" }
 *       403: { description: "admins:write ruxsati yo'q" }
 *       404: { description: Admin topilmadi }
 */
router.put(
  "/admins/:userId/permissions",
  requirePermission(PERMISSIONS.ADMINS_WRITE),
  updateAdminPermissions
);

/**
 * @openapi
 * /api/v1/admin/admins/{userId}/revoke:
 *   post:
 *     tags: [Admin]
 *     summary: Admin huquqini butunlay olib tashlash
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Admin huquqi olib tashlandi }
 *       400: { description: "O'zini yoki oxirgi admins:write egasini olib tashlab bo'lmaydi" }
 *       403: { description: "admins:write ruxsati yo'q" }
 *       404: { description: Admin topilmadi }
 */
router.post("/admins/:userId/revoke", requirePermission(PERMISSIONS.ADMINS_WRITE), revokeAdmin);

/**
 * @openapi
 * /api/v1/admin/billing/config:
 *   get:
 *     tags: [Admin]
 *     summary: To'lov tizimi (Stripe) holati va sozlamalari
 *     description: >
 *       API kaliti hech qachon qaytarilmaydi — faqat apiKeyConfigured (bool),
 *       enabled (admin panel flagi) va effectivelyActive (ikkalasi ham true
 *       bo'lgandagina true) qaytariladi.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Billing holati }
 *       403: { description: "billing:read ruxsati yo'q" }
 *   put:
 *     tags: [Admin]
 *     summary: Billing feature-flag va tariflarni yangilash
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled: { type: boolean }
 *               plans:
 *                 type: object
 *                 example: { pro: { priceId: "price_xxx" }, enterprise: { priceId: "price_yyy" } }
 *     responses:
 *       200: { description: Yangilandi }
 *       403: { description: "billing:write ruxsati yo'q" }
 */
router.get("/billing/config", requirePermission(PERMISSIONS.BILLING_READ), getBillingConfig);
router.put("/billing/config", requirePermission(PERMISSIONS.BILLING_WRITE), updateBillingConfig);

/**
 * @openapi
 * /api/v1/admin/plans:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha tariflar ro'yxati (narx, limitlar, faol foydalanuvchilar soni bilan)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tariflar ro'yxati }
 *       403: { description: "plans:read ruxsati yo'q" }
 *   post:
 *     tags: [Admin]
 *     summary: Yangi tarif yaratish
 *     description: >
 *       Admin istalgan sondagi tarif yaratishi mumkin — faqat
 *       free/pro/enterprise bilan cheklanmaydi.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, name, price]
 *             properties:
 *               slug: { type: string, example: "startup" }
 *               name: { type: string, example: "Startup" }
 *               description: { type: string }
 *               price:
 *                 type: object
 *                 properties:
 *                   amount: { type: number, example: 49.99 }
 *                   currency: { type: string, example: "USD" }
 *                   interval: { type: string, enum: [month, year, one_time] }
 *               features:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Kengaytirilgan AI modellar", "Ustuvor qo'llab-quvvatlash"]
 *               limits:
 *                 type: object
 *                 properties:
 *                   dailyRequests: { type: number }
 *                   monthlyRequests: { type: number }
 *                   maxTokensPerRequest: { type: number }
 *                   rateLimitPerMinute: { type: number }
 *                   maxFileUploadsPerMonth: { type: number }
 *                   maxWebhooks: { type: number }
 *                   maxApiKeys: { type: number }
 *               stripePriceId: { type: string }
 *               isActive: { type: boolean, default: true }
 *               isDefault: { type: boolean, default: false }
 *               sortOrder: { type: number, default: 0 }
 *     responses:
 *       201: { description: Tarif yaratildi }
 *       400: { description: "Noto'g'ri so'rov" }
 *       403: { description: "plans:write ruxsati yo'q" }
 *       409: { description: "Bu slug bilan tarif allaqachon mavjud" }
 */
router.get("/plans", requirePermission(PERMISSIONS.PLANS_READ), listPlans);
router.post("/plans", requirePermission(PERMISSIONS.PLANS_WRITE), createPlan);

/**
 * @openapi
 * /api/v1/admin/plans/{slug}:
 *   get:
 *     tags: [Admin]
 *     summary: Bitta tarif tafsilotlari
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tarif tafsilotlari }
 *       404: { description: Tarif topilmadi }
 *   put:
 *     tags: [Admin]
 *     summary: Tarifni tahrirlash (narx, features, limits — istalgan qismini)
 *     description: slug o'zgartirib bo'lmaydi — faqat name/price/features/limits/isActive/isDefault/sortOrder.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tarif yangilandi }
 *       400: { description: "Noto'g'ri so'rov yoki slug o'zgartirishga urinish" }
 *       403: { description: "plans:write ruxsati yo'q" }
 *       404: { description: Tarif topilmadi }
 *   delete:
 *     tags: [Admin]
 *     summary: Tarifni butunlay o'chirish
 *     description: >
 *       Agar bu tarifda faol foydalanuvchilar bo'lsa 409 qaytaradi —
 *       avval ularni ko'chiring yoki shunchaki isActive=false qiling.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tarif o'chirildi }
 *       403: { description: "plans:write ruxsati yo'q" }
 *       404: { description: Tarif topilmadi }
 *       409: { description: "Faol foydalanuvchilari bor, o'chirib bo'lmaydi" }
 */
router.get("/plans/:slug", requirePermission(PERMISSIONS.PLANS_READ), getPlan);
router.put("/plans/:slug", requirePermission(PERMISSIONS.PLANS_WRITE), updatePlan);
router.delete("/plans/:slug", requirePermission(PERMISSIONS.PLANS_WRITE), deletePlan);

/**
 * @openapi
 * /api/v1/admin/plans/{slug}/toggle:
 *   post:
 *     tags: [Admin]
 *     summary: Tarifni faollashtirish/nofaollashtirish
 *     description: Nofaol tarif yangi obuna uchun ko'rsatilmaydi, lekin mavjud foydalanuvchilarga ta'sir qilmaydi.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Holat almashtirildi }
 *       403: { description: "plans:write ruxsati yo'q" }
 *       404: { description: Tarif topilmadi }
 */
router.post("/plans/:slug/toggle", requirePermission(PERMISSIONS.PLANS_WRITE), togglePlanStatus);

/**
 * @openapi
 * /api/v1/admin/analytics/revenue:
 *   get:
 *     tags: [Admin]
 *     summary: Daromad analitikasi (MRR, tarif bo'yicha taqsimot, trend)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6 }
 *         description: Nechta oylik trend ko'rsatilsin
 *     responses:
 *       200: { description: Daromad statistikasi }
 *       403: { description: "analytics:read ruxsati yo'q" }
 */
router.get("/analytics/revenue", requirePermission(PERMISSIONS.ANALYTICS_READ), getRevenueAnalytics);

/**
 * @openapi
 * /api/v1/admin/analytics/usage:
 *   get:
 *     tags: [Admin]
 *     summary: Ishlatilish analitikasi (so'rovlar, xatolik darajasi, javob vaqti trendi)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: Ishlatilish statistikasi }
 *       403: { description: "analytics:read ruxsati yo'q" }
 */
router.get("/analytics/usage", requirePermission(PERMISSIONS.ANALYTICS_READ), getUsageAnalytics);

/**
 * @openapi
 * /api/v1/admin/analytics/user-growth:
 *   get:
 *     tags: [Admin]
 *     summary: Foydalanuvchilar o'sishi va saqlanish (retention) statistikasi
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6 }
 *     responses:
 *       200: { description: O'sish statistikasi }
 *       403: { description: "analytics:read ruxsati yo'q" }
 */
router.get(
  "/analytics/user-growth",
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  getUserGrowthAnalytics
);

/**
 * @openapi
 * /api/v1/admin/analytics/model-costs:
 *   get:
 *     tags: [Admin]
 *     summary: AI model/provider bo'yicha xarajat va token ishlatilishi
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: Model xarajatlari }
 *       403: { description: "analytics:read ruxsati yo'q" }
 */
router.get(
  "/analytics/model-costs",
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  getModelCostAnalytics
);

module.exports = router;
