const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");

dotenv.config();

const { initRedis, getRedis } = require("./config/redis");
const { initStripe } = require("./config/stripe");
const swaggerSpec = require("./config/swagger");
const { initializeLimiters, globalLimiter } = require("./middlewares/rateLimiter");
const { requestLogger } = require("./middlewares/requestLogger");
const { i18nMiddleware } = require("./middlewares/i18n");
const errorHandler = require("./middlewares/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const aiRoutes = require("./modules/ai/ai.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const fileRoutes = require("./modules/file/file.routes");
const webhookRoutes = require("./modules/webhook/webhook.routes");
const billingRoutes = require("./modules/billing/billing.routes");
const billingController = require("./modules/billing/billing.controller");

// Redis ulanishi va unga bog'liq rate-limiterlar route'lar ro'yxatga
// olinishidan OLDIN ishga tushirilishi kerak — aks holda
// express-rate-limit "so'rov handler ichida yaratildi" xatosini beradi
// (chunki globalLimiter middleware sifatida pastda darhol ishlatiladi).
initRedis();
initializeLimiters();
initStripe();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || "*",
  credentials: true,
}));

// MUHIM: Stripe webhook'i xom (raw) request body talab qiladi, chunki
// signature tekshiruvi (stripe.webhooks.constructEvent) butun byte
// ketma-ketligini hisobga oladi — JSON.parse qilingandan keyin qayta
// JSON.stringify qilingan versiya bir xil bo'lmasligi mumkin (masalan
// key tartibi, bo'shliqlar farqi tufayli) va signature mos kelmay qoladi.
// Shuning uchun bu route global express.json() dan OLDIN, o'zining
// express.raw() bilan alohida ro'yxatga olinishi shart.
app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }), billingController.handleWebhook);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan("dev"));

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(requestLogger);
app.use(i18nMiddleware);
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

app.get("/health/detailed", async (req, res) => {
  const mongoose = require("mongoose");

  const mongoState = mongoose.connection.readyState;
  const mongoStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  let redisStatus = "not_configured";
  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping?.();
      redisStatus = "connected";
    } catch {
      redisStatus = "error";
    }
  }

  const checks = {
    mongo: mongoStatusMap[mongoState] || "unknown",
    redis: redisStatus,
    s3: require("./config/s3").isS3Configured ? "configured" : "not_configured",
  };

  const isHealthy = checks.mongo === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * API hujjatlari (Swagger UI). Manba: route fayllaridagi @openapi JSDoc
 * bloklaridan avtomatik generatsiya qilinadi (config/swagger.js).
 *
 * SWAGGER_ENABLED=false qilib qo'yilsa (masalan ba'zi production
 * muhitlarida hujjatni ochiq qoldirishni istamasangiz), bu route
 * butunlay ro'yxatga olinmaydi. Standart holatda yoqilgan.
 *
 * helmet() global CSP'ni qattiq sozlaganligi sabab, Swagger UI'ning
 * o'zining inline <script>/<style> teglari bloklanmasligi uchun shu
 * route uchun alohida, yumshatilgan CSP beramiz — global sozlamani
 * o'zgartirmasdan.
 */
if (process.env.SWAGGER_ENABLED !== "false") {
  const swaggerCsp = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  });

  app.use("/api-docs", swaggerCsp, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Xom OpenAPI JSON — boshqa tool'lar (Postman, Insomnia, kod generatorlari)
  // import qilishi uchun qulay.
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swaggerSpec);
  });
}

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/billing", billingRoutes);

app.use((req, res) => {
  res.status(404).json({ error: req.t ? req.t("common.not_found") : "Not found." });
});

app.use(errorHandler);

module.exports = app;
