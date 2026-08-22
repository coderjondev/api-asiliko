const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { apiKeyAuth } = require("../../middlewares/apiKeyAuth");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const { chat, getHistory, submitFeedback, regenerate } = require("./ai.controller");

const authOrApiKey = (req, res, next) => {
  const token = req.header("Authorization");
  const apiKey = req.header("X-API-Key");

  if (apiKey) {
    return apiKeyAuth(req, res, next);
  } else if (token) {
    return auth(req, res, next);
  } else {
    return res.status(401).json({
      error: "Autentifikatsiya talab qilinadi",
      hint: "Authorization header yoki X-API-Key header yuborishingiz kerak"
    });
  }
};

/**
 * @openapi
 * /api/v1/ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: AI chat so'rovi yuborish
 *     security: [{ bearerAuth: [] }, { apiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string }
 *               provider: { type: string, description: "Berilmasa model orqali avtomatik aniqlanadi" }
 *               model: { type: string, example: "claude-haiku-4-5" }
 *               stream: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: AI javobi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 promptId: { type: string, description: "Feedback/refresh uchun ishlatiladigan ID" }
 *                 response: { type: string }
 *                 provider: { type: string }
 *                 model: { type: string }
 */
router.post("/chat", aiLimiter, authOrApiKey, chat);

/**
 * @openapi
 * /api/v1/ai/history:
 *   get:
 *     tags: [AI]
 *     summary: Foydalanuvchining suhbat tarixi
 *     security: [{ bearerAuth: [] }, { apiKeyAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Suhbat tarixi ro'yxati (promptId, feedback holati bilan) }
 */
router.get("/history", authOrApiKey, getHistory);

/**
 * @openapi
 * /api/v1/ai/{promptId}/feedback:
 *   post:
 *     tags: [AI]
 *     summary: AI javobiga baho berish (good/bad)
 *     description: >
 *       ChatGPT/Gemini/Claude uslubidagi 👍/👎. promptId — /chat javobida
 *       qaytgan `promptId` qiymati.
 *     security: [{ bearerAuth: [] }, { apiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: promptId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: string, enum: [good, bad] }
 *               comment: { type: string, description: "Ixtiyoriy izoh" }
 *     responses:
 *       200: { description: Feedback saqlandi }
 *       400: { description: "rating notog'ri" }
 *       404: { description: "Javob topilmadi yoki boshqa foydalanuvchiga tegishli" }
 */
router.post("/:promptId/feedback", authOrApiKey, submitFeedback);

/**
 * @openapi
 * /api/v1/ai/{promptId}/regenerate:
 *   post:
 *     tags: [AI]
 *     summary: Javobni qayta generatsiya qilish ("refresh" tugmasi)
 *     description: >
 *       Asl savolni xuddi shu provider/model bilan qayta yuboradi va
 *       yangi promptId bilan yangi javob yaratadi — eski javob va uning
 *       feedback'i o'zgarmasdan tarixda qoladi.
 *     security: [{ bearerAuth: [] }, { apiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: promptId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Yangi AI javobi }
 *       404: { description: "Asl javob topilmadi" }
 */
router.post("/:promptId/regenerate", aiLimiter, authOrApiKey, regenerate);

module.exports = router;
