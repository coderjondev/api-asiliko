const express = require("express");
const router = express.Router();
const { adminAuth } = require("../../middlewares/auth");
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

// AI Config
router.get("/ai/config", adminAuth, getAIConfig);
router.put("/ai/config", adminAuth, updateAIConfig);
router.post("/ai/default-provider", adminAuth, setDefaultProvider);

// System Stats
router.get("/stats", adminAuth, getSystemStats);

// User Management
router.get("/users", adminAuth, getUsers);
router.put("/users/:userId/tier", adminAuth, updateUserTier);
router.post("/users/:userId/toggle", adminAuth, toggleUserStatus);

// Request Logs
router.get("/logs", adminAuth, getRequestLogs);

module.exports = router;
