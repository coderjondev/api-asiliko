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
      console.log(`\n📚 API Endpoints:`);
      console.log(`   GET  /                         - Health check`);
      console.log(`   GET  /health                   - Health status`);
      console.log(`\n👤 User:`);
      console.log(`   POST /api/v1/users/register    - Ro'yxatdan o'tish`);
      console.log(`   POST /api/v1/users/login       - Kirish`);
      console.log(`   GET  /api/v1/users/profile     - Profil`);
      console.log(`   POST /api/v1/users/api-keys    - API key yaratish`);
      console.log(`   GET  /api/v1/users/api-keys    - API keylar ro'yxati`);
      console.log(`   DELETE /api/v1/users/api-keys/:id - API key o'chirish`);
      console.log(`\n🤖 AI:`);
      console.log(`   POST /api/v1/ai/chat           - AI chat`);
      console.log(`   GET  /api/v1/ai/history        - Chat tarixi`);
      console.log(`\n👨‍💼 Admin:`);
      console.log(`   GET  /api/v1/admin/stats       - Tizim statistikasi`);
      console.log(`   GET  /api/v1/admin/users       - Foydalanuvchilar`);
      console.log(`   GET  /api/v1/admin/logs        - Request loglar`);
      console.log(`   GET  /api/v1/admin/ai/config   - AI config`);
      console.log(`\n⏳ Ctrl+C bilan to'xtatish\n`);
    });
  } catch (error) {
    console.error("❌ Server ishga tushirishda xatolik:", error);
    process.exit(1);
  }
};

startServer();
