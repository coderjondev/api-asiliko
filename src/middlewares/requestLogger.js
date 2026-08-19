const RequestLog = require("../models/RequestLog");
const logger = require("../utils/logger");

const requestLogger = async (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", async () => {
    try {
      const responseTime = Date.now() - startTime;

      if (process.env.ENABLE_REQUEST_LOGGING === "true") {
        await RequestLog.create({
          userId: req.userId || null,
          apiKey: req.apiKey?._id || null,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
          provider: req.aiProvider || null,
          model: req.aiModel || null,
          tokensUsed: req.tokensUsed || null,
          error: res.statusCode >= 400 ? res.statusMessage : null,
        });
      }
    } catch (error) {
      logger.error("Request log xatosi:", error.message);
    }
  });

  next();
};

module.exports = { requestLogger };
