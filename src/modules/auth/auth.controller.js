const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../../config/email");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, name, language } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: req.t("auth.email_already_exists") });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      email,
      password,
      name,
      // Ro'yxatdan o'tishda til ko'rsatilsa (masalan frontend
      // ?lang= yoki body orqali), profilga saqlaymiz — keyingi
      // so'rovlarda i18n middleware shu qiymatni ishlatadi.
      language: req.language,
      emailVerificationToken,
      emailVerificationExpires,
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, emailVerificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue even if email fails
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: req.t("auth.registration_success"),
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        language: user.language,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: req.t("auth.invalid_token") });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: req.t("auth.email_verified") });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: req.t("auth.user_not_found") });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: req.t("auth.already_verified") });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    await sendVerificationEmail(user.email, emailVerificationToken);

    res.json({ message: req.t("auth.registration_success") });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: req.t("auth.invalid_credentials") });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: req.t("auth.invalid_credentials") });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: req.t("common.forbidden") });
    }

    const token = generateToken(user._id);

    res.json({
      message: req.t("auth.login_success"),
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        language: user.language,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: req.t("auth.password_reset_sent") });
    }

    const passwordResetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();

    await sendPasswordResetEmail(user.email, passwordResetToken);

    res.json({ message: req.t("auth.password_reset_sent") });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: req.t("auth.invalid_token") });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: req.t("auth.password_reset_success") });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // auth middleware req.user'ga to'liq user hujjatini joylaydi —
    // qayta so'rov yubormasdan shundan foydalanamiz, faqat parolni chiqarib tashlaymiz.
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: req.t("auth.user_not_found") });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

/**
 * Foydalanuvchi o'z interfeys tilini o'zgartiradi.
 * PUT /api/v1/auth/language  Body: { language: "ru" }
 */
exports.updateLanguage = async (req, res) => {
  try {
    const { isSupportedLanguage, SUPPORTED_LANGUAGES } = require("../../i18n");
    const { language } = req.body;

    if (!language || !isSupportedLanguage(language)) {
      return res.status(400).json({
        error: req.t("common.validation_error"),
        supportedLanguages: SUPPORTED_LANGUAGES,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { language },
      { new: true }
    ).select("-password");

    res.json({ message: req.t("common.language_updated"), user });
  } catch (error) {
    console.error("Update language error:", error);
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};
