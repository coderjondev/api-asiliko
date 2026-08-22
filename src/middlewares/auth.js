const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { PERMISSIONS } = require("../constants/roles");

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

/**
 * Faqat role === "admin" bo'lgan foydalanuvchilarga ruxsat beradi,
 * lekin permissionlarni tekshirmaydi — umumiy "admin panelga kirish"
 * uchun. Aniqroq nazorat kerak bo'lsa requirePermission() dan foydalaning.
 *
 * ESLATMA (tuzatilgan bug): ilgari bu funksiya `auth(req, res, () => {})`
 * ni chaqirib, keyin natijadan qat'iy nazar davom etar edi. auth() o'zi
 * xato holatida allaqachon res.status().json() chaqirib bo'lgan bo'lsa
 * ham, tashqi kod buni bilmay yana bir marta javob yozishga urinar edi —
 * bu Express'da "headers already sent" xatosiga olib kelardi. Endi bitta
 * marta autentifikatsiya qilinadi va javob faqat bir marta yuboriladi.
 */
const adminAuth = async (req, res, next) => {
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

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin huquqi talab qilinadi" });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: "Yaroqsiz token" });
  }
};

/**
 * Permission-based tekshiruv middleware generatori. adminAuth'dan KEYIN
 * ishlatiladi (req.user allaqachon o'rnatilgan bo'lishi kerak) — yoki
 * to'g'ridan-to'g'ri o'rniga ishlatilishi ham mumkin, chunki avtomatik
 * ravishda autentifikatsiyani ham bajaradi.
 *
 * Foydalanish:
 *   router.get("/models", requirePermission(PERMISSIONS.MODELS_READ), ...)
 *   router.post("/models", requirePermission(PERMISSIONS.MODELS_WRITE), ...)
 *
 * Bir nechta ruxsatdan birontasi yetarli bo'lsa массив beriladi:
 *   requirePermission([PERMISSIONS.MODELS_READ, PERMISSIONS.STATS_READ])
 */
const requirePermission = (permission) => {
  const required = Array.isArray(permission) ? permission : [permission];

  return async (req, res, next) => {
    try {
      // Agar req.user hali o'rnatilmagan bo'lsa (masalan requirePermission
      // to'g'ridan-to'g'ri, adminAuth'siz ishlatilgan bo'lsa), o'zimiz
      // autentifikatsiya qilamiz.
      if (!req.user) {
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
      }

      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin huquqi talab qilinadi" });
      }

      if (!req.user.hasAnyPermission(required)) {
        return res.status(403).json({
          error: "Bu amal uchun ruxsatingiz yetarli emas",
          required,
        });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: "Yaroqsiz token" });
    }
  };
};

module.exports = {
  auth,
  adminAuth,
  requirePermission,
  authenticateToken: auth, // Alias for compatibility
};
