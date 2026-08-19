const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    lastUsed: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: Date,
    usage: {
      total: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now },
    },
    permissions: {
      type: [String],
      default: ["chat", "history"],
    },
  },
  {
    timestamps: true,
  }
);

apiKeySchema.index({ key: 1, isActive: 1 });
apiKeySchema.index({ userId: 1, isActive: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ApiKey", apiKeySchema);
