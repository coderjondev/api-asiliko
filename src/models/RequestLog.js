const mongoose = require("mongoose");

const requestLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    apiKey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
    },
    method: String,
    path: String,
    statusCode: Number,
    responseTime: Number,
    ip: String,
    userAgent: String,
    provider: String,
    model: String,
    tokensUsed: Number,
    error: String,
  },
  {
    timestamps: true,
  }
);

requestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("RequestLog", requestLogSchema);
