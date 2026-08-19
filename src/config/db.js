const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(`✅ MongoDB ulandi: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB ulanish xatosi: ${error.message}`);
    logger.warn(`⚠️  MongoDB'siz ishga tushdi. Ba'zi funksiyalar ishlamaydi.`);
    logger.warn(`⚠️  MongoDB Atlas'da IP manzilingizni whitelist'ga qo'shing: https://www.mongodb.com/docs/atlas/security-whitelist/`);
    // MongoDB ulanmasa ham server ishga tushsin
  }
};

module.exports = connectDB;
