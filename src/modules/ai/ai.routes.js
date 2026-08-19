const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { apiKeyAuth } = require("../../middlewares/apiKeyAuth");
const { aiLimiter } = require("../../middlewares/rateLimiter");
const { chat, getHistory } = require("./ai.controller");

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

router.post("/chat", aiLimiter, authOrApiKey, chat);
router.get("/history", authOrApiKey, getHistory);

module.exports = router;
