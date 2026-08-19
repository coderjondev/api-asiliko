const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

systemConfigSchema.statics.getConfig = async function (key) {
  const config = await this.findOne({ key, isActive: true });
  return config ? config.value : null;
};

systemConfigSchema.statics.setConfig = async function (key, value, description) {
  return await this.findOneAndUpdate(
    { key },
    { value, description, isActive: true },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model("SystemConfig", systemConfigSchema);
