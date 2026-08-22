const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { authenticateToken } = require("../../middlewares/auth");

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Yangi foydalanuvchi ro'yxatdan o'tkazish
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: Muvaffaqiyatli ro'yxatdan o'tildi }
 *       400: { description: Yaroqsiz ma'lumot, $ref: '#/components/schemas/Error' }
 *       409: { description: Bu email allaqachon ro'yxatdan o'tgan }
 */
router.post("/register", authController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login qilish va JWT token olish
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login muvaffaqiyatli, JWT token qaytariladi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { type: object }
 *       401: { description: Email yoki parol noto'g'ri }
 */
router.post("/login", authController.login);

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Emailni tasdiqlash tokeni orqali
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email tasdiqlandi }
 *       400: { description: Token yaroqsiz yoki muddati tugagan }
 */
router.get("/verify-email", authController.verifyEmail);

/**
 * @openapi
 * /api/v1/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Email tasdiqlash xabarini qayta yuborish
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tasdiqlash xabari qayta yuborildi }
 *       400: { description: Email allaqachon tasdiqlangan }
 *       401: { description: Autentifikatsiya talab qilinadi }
 */
router.post("/resend-verification", authenticateToken, authController.resendVerification);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Parolni tiklash uchun email yuborish
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: "Agar email mavjud bo'lsa, tiklash xabari yuborildi" }
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Yangi parol o'rnatish (reset token orqali)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Parol muvaffaqiyatli yangilandi }
 *       400: { description: Token yaroqsiz yoki muddati tugagan }
 */
router.post("/reset-password", authController.resetPassword);

/**
 * @openapi
 * /api/v1/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Joriy foydalanuvchi profilini olish
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Foydalanuvchi profili }
 *       401: { description: Autentifikatsiya talab qilinadi }
 */
router.get("/profile", authenticateToken, authController.getProfile);

/**
 * @openapi
 * /api/v1/auth/language:
 *   put:
 *     tags: [Auth]
 *     summary: Foydalanuvchining interfeys/xabarlar tilini o'zgartirish
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [language]
 *             properties:
 *               language: { type: string, example: "ru", description: "uz, en, ru, tr, de, fr, es, ar, zh, ja, ko" }
 *     responses:
 *       200: { description: Til yangilandi }
 *       400: { description: "Qo'llab-quvvatlanmaydigan til kodi" }
 */
router.put("/language", authenticateToken, authController.updateLanguage);

module.exports = router;
