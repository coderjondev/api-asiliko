const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { authLimiter } = require("../../middlewares/rateLimiter");
// Eslatma: register/login mantig'i endi bitta manbadan — auth.controller.js.
// Ilgari bu yerda user.controller.js ichida email-verification'siz alohida
// register/login nusxasi bor edi (ikki mustaqil auth tizimi bir-biridan
// bexabar ishlar edi). Bug sifatida tuzatildi — URL'lar o'zgarmadi,
// faqat mantiq birlashtirildi.
const authController = require("../auth/auth.controller");
const { createApiKey, listApiKeys, deleteApiKey } = require("./apiKey.controller");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/profile", auth, authController.getProfile);

router.post("/api-keys", auth, createApiKey);
router.get("/api-keys", auth, listApiKeys);
router.delete("/api-keys/:keyId", auth, deleteApiKey);

module.exports = router;
