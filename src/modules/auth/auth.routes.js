const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { authenticateToken } = require("../../middlewares/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authenticateToken, authController.resendVerification);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/profile", authenticateToken, authController.getProfile);

module.exports = router;
