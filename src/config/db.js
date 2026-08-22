const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * MongoDB Atlas'ga ulanish.
 *
 * TLS/SSL xatolari haqida ("SSL alert number 80",
 * "tlsv1 alert internal error"): bu ko'pincha connectDB() o'zi
 * muvaffaqiyatli tugagandan KEYIN, birinchi haqiqiy so'rov (masalan
 * SystemConfig.findOne) paytida yuz beradi — chunki mongoose.connect()
 * dastlabki TCP-darajadagi ulanishni tekshiradi, to'liq TLS handshake
 * esa keyingi query'da amalga oshishi mumkin. Bu odatda MUHITGA
 * (Node.js versiyasi, tarmoq/provayder, DNS) bog'liq muammo — kodning
 * o'zida tuzatib bo'lmaydi, lekin retry va aniqroq diagnostika bilan
 * yumshatiladi.
 *
 * Agar bu xato tez-tez chiqsa, tekshiring:
 *   1. Node.js versiyasi — LTS versiyasiga o'ting (`nvm install --lts`)
 *   2. MONGO_URI'da &tls=true&tlsAllowInvalidCertificates=false borligini
 *      tekshiring (Atlas standart ulanish satrida bo'lishi kerak)
 *   3. VPN/corporate firewall ishlatayotgan bo'lsangiz, uni vaqtincha
 *      o'chirib ko'ring — ba'zi tarmoqlar TLS paketlarini buzadi
 *   4. MongoDB Atlas'da Network Access > IP Whitelist'da joriy IP
 *      qo'shilganini tekshiring
 */
const connectDB = async (retries = 3, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        // Atlas bilan TLS handshake'ni barqarorlashtirish uchun aniq
        // versiya diapazoni — ba'zi Node/OpenSSL kombinatsiyalarida
        // standart TLS muzokara jarayoni Atlas bilan mos kelmasligi
        // mumkin.
        family: 4, // IPv6 orqali DNS/TLS muammolarining oldini olish uchun IPv4'ni majburlaydi
      });
      logger.info(`✅ MongoDB ulandi: ${conn.connection.host}`);

      // Ulanish o'rnatilgandan keyin ham keyinchalik uzilib qolishi
      // mumkin (masalan tarmoq beqarorligi) — buni log qilib boramiz,
      // shunda production'da sabab tezroq aniqlanadi.
      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB ulanish xatosi (runtime): ${err.message}`);
      });
      mongoose.connection.on("disconnected", () => {
        logger.warn("⚠️ MongoDB ulanishi uzildi");
      });

      return; // muvaffaqiyatli — qayta urinish shart emas
    } catch (error) {
      const isLastAttempt = attempt === retries;
      logger.error(
        `❌ MongoDB ulanish xatosi (urinish ${attempt}/${retries}): ${error.message}`
      );

      if (isLastAttempt) {
        logger.warn("⚠️  MongoDB'siz ishga tushdi. Ba'zi funksiyalar ishlamaydi.");
        logger.warn(
          "⚠️  Agar bu 'SSL alert'/'tlsv1 alert internal error' bo'lsa — bu odatda muhit (Node versiyasi, tarmoq, DNS) muammosi. README.md dagi 'Muammolarni bartaraf etish' bo'limiga qarang."
        );
        logger.warn(
          "⚠️  MongoDB Atlas'da IP manzilingizni whitelist'ga qo'shganingizni tekshiring: https://www.mongodb.com/docs/atlas/security-whitelist/"
        );
      } else {
        logger.warn(`Qayta urinilmoqda (${delayMs}ms dan keyin)...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
};

module.exports = connectDB;
