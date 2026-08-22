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
    // Foydalanuvchi javobga bergan baho (OpenAI/Gemini/Claude uslubida
    // 👍/👎). Prompt._id — aynan "AI javobining ID"si, feedback shu
    // hujjatning o'ziga yoziladi (alohida kolleksiya emas — oddiy va
    // tez so'rov uchun).
    feedback: {
      rating: {
        type: String,
        enum: ["good", "bad", null],
        default: null,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      ratedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

promptSchema.index({ "feedback.rating": 1, createdAt: -1 });
promptSchema.index({ provider: 1, model: 1, createdAt: -1 });

module.exports = mongoose.model("Prompt", promptSchema);
