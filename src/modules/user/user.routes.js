const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { authLimiter } = require("../../middlewares/rateLimiter");
const { register, login, getProfile } = require("./user.controller");
const { createApiKey, listApiKeys, deleteApiKey } = require("./apiKey.controller");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/profile", auth, getProfile);

router.post("/api-keys", auth, createApiKey);
router.get("/api-keys", auth, listApiKeys);
router.delete("/api-keys/:keyId", auth, deleteApiKey);

module.exports = router;
