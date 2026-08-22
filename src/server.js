const app = require("./app");
const connectDB = require("./config/db.js");
const { initializeSystemConfig } = require("./utils/initConfig");
const aiConfig = require("./config/ai");
const { startScheduler } = require("./utils/scheduler");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    if (process.env.MONGO_URI) {
      await initializeSystemConfig();
      await aiConfig.initialize();
    }

    if (process.env.NODE_ENV === "production") {
      startScheduler();
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server muvaffaqiyatli ishga tushdi!`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📖 API hujjatlari: http://localhost:${PORT}/api-docs`);
      console.log(`\n⏳ Ctrl+C bilan to'xtatish\n`);
    });
  } catch (error) {
    console.error("❌ Server ishga tushirishda xatolik:", error);
    process.exit(1);
  }
};

startServer();
