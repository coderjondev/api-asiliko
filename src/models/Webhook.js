const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    events: [
      {
        type: String,
        enum: [
          "user.registered",
          "user.verified",
          "ai.request.completed",
          "ai.request.failed",
          "file.uploaded",
          "file.deleted",
          "apikey.created",
          "apikey.revoked",
          "usage.limit.reached",
        ],
      },
    ],
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    retryConfig: {
      maxRetries: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 1000 },
    },
    stats: {
      totalCalls: { type: Number, default: 0 },
      successfulCalls: { type: Number, default: 0 },
      failedCalls: { type: Number, default: 0 },
      lastTriggered: Date,
      lastSuccess: Date,
      lastFailure: Date,
    },
  },
  {
    timestamps: true,
  }
);

webhookSchema.index({ userId: 1, isActive: 1 });
webhookSchema.index({ events: 1 });

module.exports = mongoose.model("Webhook", webhookSchema);
