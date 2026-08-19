const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const User = require("../models/User");

const hashApiKey = (key) => {
  return crypto.createHash("sha256").update(key).digest("hex");
};

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header("X-API-Key") || req.header("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return res.status(401).json({ error: "API key talab qilinadi" });
    }

    const hashedKey = hashApiKey(apiKey);

    const keyDoc = await ApiKey.findOne({
      key: hashedKey,
      isActive: true,
    });

    if (!keyDoc) {
      return res.status(401).json({ error: "Yaroqsiz yoki faol emas API key" });
    }

    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
      return res.status(401).json({ error: "API key muddati tugagan" });
    }

    const user = await User.findById(keyDoc.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    }

    keyDoc.lastUsed = new Date();
    keyDoc.usage.total += 1;
    await keyDoc.save();

    req.user = user;
    req.userId = user._id;
    req.apiKey = keyDoc;

    next();
  } catch (error) {
    res.status(401).json({ error: "Autentifikatsiya xatosi" });
  }
};

module.exports = { apiKeyAuth };
