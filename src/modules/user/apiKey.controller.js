const crypto = require("crypto");
const ApiKey = require("../../models/ApiKey");
const User = require("../../models/User");

const generateApiKey = () => {
  const prefix = process.env.API_KEY_PREFIX || "sk_";
  const randomBytes = crypto.randomBytes(32).toString("hex");
  return `${prefix}${randomBytes}`;
};

const hashApiKey = (key) => {
  return crypto.createHash("sha256").update(key).digest("hex");
};

const createApiKey = async (req, res) => {
  try {
    const { name, expiresInDays } = req.body;

    if (!name) {
      return res.status(400).json({ error: "API key nomi talab qilinadi" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const existingKeys = await ApiKey.countDocuments({
      userId: req.userId,
      isActive: true,
    });

    const maxKeys = user.tier === "free" ? 2 : user.tier === "pro" ? 5 : 10;

    if (existingKeys >= maxKeys) {
      return res.status(400).json({
        error: `Maksimal API key limiti: ${maxKeys}`,
        current: existingKeys,
      });
    }

    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(
          Date.now() +
            (parseInt(process.env.API_KEY_EXPIRES_IN_DAYS) || 365) *
              24 *
              60 *
              60 *
              1000
        );

    const newApiKey = await ApiKey.create({
      userId: req.userId,
      key: hashedKey,
      name,
      prefix: apiKey.substring(0, 7),
      expiresAt,
    });

    res.status(201).json({
      message: "API key yaratildi",
      apiKey: apiKey,
      keyInfo: {
        id: newApiKey._id,
        name: newApiKey.name,
        prefix: newApiKey.prefix,
        expiresAt: newApiKey.expiresAt,
        createdAt: newApiKey.createdAt,
      },
      warning: "Bu key faqat bir marta ko'rsatiladi. Xavfsiz saqlang!",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({
      userId: req.userId,
      isActive: true,
    })
      .select("-key")
      .sort({ createdAt: -1 });

    res.json({
      total: keys.length,
      keys: keys.map((k) => ({
        id: k._id,
        name: k.name,
        prefix: k.prefix,
        lastUsed: k.lastUsed,
        expiresAt: k.expiresAt,
        usage: k.usage,
        createdAt: k.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      userId: req.userId,
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key topilmadi" });
    }

    apiKey.isActive = false;
    await apiKey.save();

    res.json({ message: "API key o'chirildi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createApiKey, listApiKeys, deleteApiKey };
