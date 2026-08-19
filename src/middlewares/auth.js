const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Autentifikatsiya talab qilinadi" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: "Yaroqsiz token" });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin huquqi talab qilinadi" });
    }

    next();
  } catch (error) {
    res.status(401).json({ error: "Autentifikatsiya xatosi" });
  }
};

module.exports = { auth, adminAuth };
