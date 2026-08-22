const User = require("../../../models/User");
const logger = require("../../../utils/logger");
const { ALL_PERMISSIONS, ROLE_PRESETS } = require("../../../constants/roles");

/**
 * Barcha admin foydalanuvchilarni ro'yxatini (ruxsatlari bilan) qaytaradi.
 */
exports.listAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ total: admins.length, admins });
  } catch (error) {
    logger.error("List admins error:", error);
    res.status(500).json({ error: "Adminlar ro'yxatini olishda xatolik" });
  }
};

/**
 * Oddiy foydalanuvchini adminga aylantiradi va unga ruxsatlar beradi.
 * Ruxsatlar to'g'ridan-to'g'ri (permissions: [...]) yoki tayyor preset
 * nomi orqali (preset: "support") berilishi mumkin.
 */
exports.grantAdmin = async (req, res) => {
  try {
    const { userId, permissions, preset } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId talab qilinadi" });
    }

    let grantedPermissions;

    if (preset) {
      if (!ROLE_PRESETS[preset]) {
        return res.status(400).json({
          error: "Noto'g'ri preset nomi",
          availablePresets: Object.keys(ROLE_PRESETS),
        });
      }
      grantedPermissions = ROLE_PRESETS[preset];
    } else if (Array.isArray(permissions)) {
      const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
      if (invalid.length > 0) {
        return res.status(400).json({ error: "Noto'g'ri ruxsat kodlari", invalid });
      }
      grantedPermissions = permissions;
    } else {
      return res.status(400).json({
        error: "permissions massivi yoki preset nomi talab qilinadi",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: "admin", permissions: grantedPermissions },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    logger.info(
      `Admin ${req.user._id} granted admin role to ${userId} with permissions: ${grantedPermissions.join(", ")}`
    );

    res.json({ message: "Admin huquqi berildi", user });
  } catch (error) {
    logger.error("Grant admin error:", error);
    res.status(500).json({ error: "Admin huquqini berishda xatolik" });
  }
};

/**
 * Mavjud adminning ruxsatlar to'plamini to'liq almashtiradi.
 */
exports.updateAdminPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "permissions massiv bo'lishi kerak" });
    }

    const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
      return res.status(400).json({ error: "Noto'g'ri ruxsat kodlari", invalid });
    }

    const user = await User.findOne({ _id: userId, role: "admin" });

    if (!user) {
      return res.status(404).json({ error: "Admin topilmadi" });
    }

    // Oxirgi super-admin o'z ADMINS_WRITE huquqidan mahrum bo'lib
    // qolmasligi uchun himoya — aks holda hech kim boshqa adminlarni
    // boshqara olmay qoladigan holat yuzaga kelishi mumkin.
    if (
      user.permissions.includes(PERMISSIONS.ADMINS_WRITE) &&
      !permissions.includes(PERMISSIONS.ADMINS_WRITE)
    ) {
      const otherAdminsWithWrite = await User.countDocuments({
        role: "admin",
        _id: { $ne: userId },
        permissions: PERMISSIONS.ADMINS_WRITE,
      });

      if (otherAdminsWithWrite === 0) {
        return res.status(400).json({
          error:
            "Bu — 'admins:write' huquqiga ega yagona admin. Ruxsatni olib tashlashdan oldin boshqa adminga shu huquqni bering.",
        });
      }
    }

    user.permissions = permissions;
    await user.save();

    logger.info(`Admin ${req.user._id} updated permissions for ${userId}`);

    const updated = user.toObject();
    delete updated.password;
    res.json({ message: "Ruxsatlar yangilandi", user: updated });
  } catch (error) {
    logger.error("Update admin permissions error:", error);
    res.status(500).json({ error: "Ruxsatlarni yangilashda xatolik" });
  }
};

/**
 * Admin huquqini butunlay olib tashlaydi (oddiy foydalanuvchiga aylantiradi).
 */
exports.revokeAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ error: "O'zingizning admin huquqingizni olib tashlay olmaysiz" });
    }

    const user = await User.findOne({ _id: userId, role: "admin" });

    if (!user) {
      return res.status(404).json({ error: "Admin topilmadi" });
    }

    if (user.permissions.includes(PERMISSIONS.ADMINS_WRITE)) {
      const otherAdminsWithWrite = await User.countDocuments({
        role: "admin",
        _id: { $ne: userId },
        permissions: PERMISSIONS.ADMINS_WRITE,
      });

      if (otherAdminsWithWrite === 0) {
        return res.status(400).json({
          error: "Bu — 'admins:write' huquqiga ega yagona admin, avval boshqa adminga shu huquqni bering.",
        });
      }
    }

    user.role = "user";
    user.permissions = [];
    await user.save();

    logger.info(`Admin ${req.user._id} revoked admin role from ${userId}`);

    res.json({ message: "Admin huquqi olib tashlandi" });
  } catch (error) {
    logger.error("Revoke admin error:", error);
    res.status(500).json({ error: "Admin huquqini olib tashlashda xatolik" });
  }
};
