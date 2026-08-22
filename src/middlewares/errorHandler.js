const logger = require("../utils/logger");
const { t: translate, DEFAULT_LANGUAGE } = require("../i18n");

/**
 * Markazlashtirilgan Express error-handling middleware.
 * app.js oxirida, barcha route'lardan keyin ulanadi.
 *
 * i18nMiddleware bu handler'dan OLDIN ishlaydi, shuning uchun req.t
 * odatda mavjud bo'ladi. Lekin i18nMiddleware o'zi xato bersa yoki
 * boshqa sabab bilan req.t yo'q bo'lsa, DEFAULT_LANGUAGE bilan
 * to'g'ridan-to'g'ri t() ni ishlatamiz — xatolik xabarlarini hech
 * qachon "undefined is not a function" bilan almashtirmaslik uchun.
 */
const errorHandler = (err, req, res, next) => {
  const t = req.t || ((key, params) => translate(key, DEFAULT_LANGUAGE, params));

  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
  });

  // Mongoose validatsiya xatosi (masalan required maydon yo'q)
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: t("common.validation_error"), details });
  }

  // Mongoose noto'g'ri ObjectId (masalan yaroqsiz :id parametri)
  if (err.name === "CastError") {
    return res.status(400).json({ error: t("common.validation_error") });
  }

  // MongoDB unique-index buzilishi (masalan takror email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ error: t("auth.email_already_exists"), field });
  }

  // JWT xatolari
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: t("auth.invalid_token") });
  }

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? t("common.internal_error") : err.message,
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};

module.exports = errorHandler;
