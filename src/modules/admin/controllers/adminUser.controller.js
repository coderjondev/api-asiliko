const RequestLog = require("../../../models/RequestLog");
const User = require("../../../models/User");
const Prompt = require("../../../models/Prompt");

const getSystemStats = async (req, res) => {
  try {
    const [totalUsers, totalRequests, totalPrompts, activeUsers] =
      await Promise.all([
        User.countDocuments(),
        RequestLog.countDocuments(),
        Prompt.countDocuments(),
        User.countDocuments({ isActive: true }),
      ]);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [requests24h, prompts24h] = await Promise.all([
      RequestLog.countDocuments({ createdAt: { $gte: last24Hours } }),
      Prompt.countDocuments({ createdAt: { $gte: last24Hours } }),
    ]);

    const providerUsage = await Prompt.aggregate([
      {
        $group: {
          _id: "$provider",
          count: { $sum: 1 },
          totalTokens: { $sum: "$tokensUsed.total" },
        },
      },
    ]);

    const tierDistribution = await User.aggregate([
      {
        $group: {
          _id: "$tier",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        totalRequests,
        totalPrompts,
        requests24h,
        prompts24h,
      },
      providerUsage,
      tierDistribution,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === "true";

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserTier = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tier } = req.body;

    if (!["free", "pro", "enterprise"].includes(tier)) {
      return res.status(400).json({ error: "Noto'g'ri tier" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { tier },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    res.json({ message: "Tier yangilandi", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `Foydalanuvchi ${user.isActive ? "faollashtirildi" : "o'chirildi"}`,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRequestLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.statusCode) filter.statusCode = parseInt(req.query.statusCode);
    if (req.query.provider) filter.provider = req.query.provider;

    const [logs, total] = await Promise.all([
      RequestLog.find(filter)
        .populate("userId", "email name tier")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RequestLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSystemStats,
  getUsers,
  updateUserTier,
  toggleUserStatus,
  getRequestLogs,
};
