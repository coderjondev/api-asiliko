const swaggerJsdoc = require("swagger-jsdoc");

/**
 * OpenAPI/Swagger konfiguratsiyasi. swagger-jsdoc route fayllaridagi
 * JSDoc @openapi bloklarini o'qib, avtomatik ravishda spec generatsiya
 * qiladi — shuning uchun hujjat va real endpoint kodi bir-biridan
 * uzoqlashib ketmaydi (qo'lda yozilgan alohida JSON/YAML fayldan farqli
 * o'laroq).
 */
const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Asiliko API",
      version: "1.0.0",
      description:
        "AI so'rovlar, admin panel, webhook, fayl yuklash va to'lov (Stripe) imkoniyatlariga ega backend xizmati.",
    },
    servers: [
      {
        url: process.env.APP_URL || "http://localhost:5000",
        description: process.env.NODE_ENV === "production" ? "Production" : "Local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Login/register orqali olingan JWT token",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Foydalanuvchi profilida yaratilgan API key",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Xatolik xabari" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Ro'yxatdan o'tish, login, email tasdiqlash, parolni tiklash" },
      { name: "Users", description: "Foydalanuvchi profili va API key boshqaruvi" },
      { name: "AI", description: "AI chat va streaming so'rovlar" },
      { name: "Files", description: "Fayl yuklash va boshqarish (S3)" },
      { name: "Webhooks", description: "Webhook yaratish va boshqarish" },
      { name: "Billing", description: "Obuna, checkout, Stripe webhook" },
      { name: "Admin", description: "Admin panel: foydalanuvchilar, modellar, statistika, adminlar" },
      { name: "System", description: "Health check va tizim holati" },
    ],
  },
  // JSDoc @openapi bloklari shu fayllardan qidiriladi
  apis: [
    "./src/modules/**/*.routes.js",
    "./src/app.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
