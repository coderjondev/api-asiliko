const cron = require("node-cron");
const User = require("../models/User");
const logger = require("./logger");

const resetDailyUsage = async () => {
  try {
    const result = await User.updateMany(
      {},
      {
        $set: {
          "usage.daily": 0,
          "usage.lastReset": new Date(),
        },
      }
    );
    logger.info(`✅ Kunlik limitlar tiklandi. ${result.modifiedCount} foydalanuvchi`);
  } catch (error) {
    logger.error("Kunlik limitlarni tiklashda xatolik:", error.message);
  }
};

const resetMonthlyUsage = async () => {
  try {
    const result = await User.updateMany(
      {},
      {
        $set: {
          "usage.monthly": 0,
        },
      }
    );
    logger.info(`✅ Oylik limitlar tiklandi. ${result.modifiedCount} foydalanuvchi`);
  } catch (error) {
    logger.error("Oylik limitlarni tiklashda xatolik:", error.message);
  }
};

const startScheduler = () => {
  // Har kuni 00:00 da kunlik limitlarni tiklash
  cron.schedule("0 0 * * *", resetDailyUsage, {
    timezone: "Asia/Tashkent",
  });

  // Har oyning 1-kuni 00:00 da oylik limitlarni tiklash
  cron.schedule("0 0 1 * *", resetMonthlyUsage, {
    timezone: "Asia/Tashkent",
  });

  logger.info("✅ Scheduler ishga tushdi");
};

module.exports = { startScheduler, resetDailyUsage, resetMonthlyUsage };
