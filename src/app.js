const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config();

const { initRedis } = require("./config/redis");
const { globalLimiter } = require("./middlewares/rateLimiter");
const { requestLogger } = require("./middlewares/requestLogger");

const userRoutes = require("./modules/user/user.routes");
const aiRoutes = require("./modules/ai/ai.routes");
const adminRoutes = require("./modules/admin/admin.routes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || "*",
  credentials: true,
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan("dev"));

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(requestLogger);
app.use(globalLimiter);

app.get("/", (req, res) => {
  res.json({
    message: "AI Service API muvaffaqiyatli ishlayapti!",
    version: "1.0.0",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint topilmadi" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Serverda xatolik yuz berdi",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

initRedis();

module.exports = app;
