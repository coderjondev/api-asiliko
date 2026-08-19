const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/auth");
const {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateSecret,
  testWebhook,
  getWebhookStats,
} = require("./webhook.controller");

router.post("/", authenticateToken, createWebhook);
router.get("/", authenticateToken, getWebhooks);
router.get("/:webhookId", authenticateToken, getWebhook);
router.put("/:webhookId", authenticateToken, updateWebhook);
router.delete("/:webhookId", authenticateToken, deleteWebhook);
router.post("/:webhookId/regenerate-secret", authenticateToken, regenerateSecret);
router.post("/:webhookId/test", authenticateToken, testWebhook);
router.get("/:webhookId/stats", authenticateToken, getWebhookStats);

module.exports = router;
