const mongoose = require("mongoose");

/**
 * Foydalanuvchi obunasi (Stripe orqali). Billing tizimi hozircha admin
 * panelda "disabled" holatida bo'lishi mumkin (SystemConfig "billing"
 * kaliti orqali boshqariladi) — bu holatda ham model va yozuvlar
 * mavjud bo'lishi mumkin, faqat yangi checkout/webhook oqimlari
 * ishlamaydi.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    stripePriceId: String,
    // Plan.slug ga ishora qiladi — User.tier bilan bir xil mantiq
    // (ILGARI qattiq enum edi, endi admin panelda yaratilgan istalgan
    // tarifga mos kelishi uchun oddiy String).
    tier: {
      type: String,
      default: "free",
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: [
        "none", // hech qachon obuna bo'lmagan / bepul tarif
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
      ],
      default: "none",
    },
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    // Stripe'dan kelgan xom obyektni ham saqlaymiz — debugging va
    // kelajakda kerak bo'lishi mumkin bo'lgan qo'shimcha maydonlar uchun.
    lastWebhookEvent: {
      type: String,
    },
    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
