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
const {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  toggleModelStatus,
  getModelStats,
  seedDefaultModels,
} = require("./controllers/adminModel.controller");

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

// AI Model Management
router.get("/models", adminAuth, listModels);
router.post("/models", adminAuth, createModel);
router.put("/models/:modelId", adminAuth, updateModel);
router.delete("/models/:modelId", adminAuth, deleteModel);
router.post("/models/:modelId/toggle", adminAuth, toggleModelStatus);
router.get("/models/stats", adminAuth, getModelStats);
router.post("/models/seed", adminAuth, seedDefaultModels);

module.exports = router;
