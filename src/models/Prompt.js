const mongoose = require("mongoose");

const promptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    model: String,
    tokensUsed: {
      input: Number,
      output: Number,
      total: Number,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prompt", promptSchema);
