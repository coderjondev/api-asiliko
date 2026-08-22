const Plan = require("../../../models/Plan");
const User = require("../../../models/User");
const logger = require("../../../utils/logger");

/**
 * Admin panel uchun to'liq Plan (tarif) CRUD. Bu bilan admin istagancha
 * tarif yaratishi, narxini, nomini, ichidagi limitlar va marketing
 * features ro'yxatini o'zgartirishi mumkin — kodda hech narsa hardcoded
 * emas.
 */

exports.listPlans = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === "true" ? {} : {};
    // Eslatma: admin panelda inactive tariflarni ham ko'rish kerak
    // (masalan qayta faollashtirish uchun), shuning uchun default holatda
    // HAMMASINI qaytaramiz — faqat checkout endpointi (billing.service.js)
    // isActive=true bilan filtrlaydi.
    const plans = await Plan.find(filter).sort({ sortOrder: 1, "price.amount": 1 });

    // Har bir tarifda nechta faol foydalanuvchi borligini ham qo'shamiz —
    // admin bu ma'lumotsiz bexatar o'chira olmaydi (masalan 500 ta
    // foydalanuvchisi bor tarifni o'chirib qo'yish xavfli).
    const userCounts = await User.aggregate([
      { $group: { _id: "$tier", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(userCounts.map((u) => [u._id, u.count]));

    const plansWithUsage = plans.map((plan) => ({
      ...plan.toObject(),
      activeUserCount: countMap[plan.slug] || 0,
    }));

    res.json({ plans: plansWithUsage, total: plansWithUsage.length });
  } catch (error) {
    logger.error("List plans error:", error);
    res.status(500).json({ error: "Tariflar ro'yxatini olishda xatolik" });
  }
};

exports.getPlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({ slug: req.params.slug });
    if (!plan) {
      return res.status(404).json({ error: "Tarif topilmadi" });
    }
    res.json(plan);
  } catch (error) {
    logger.error("Get plan error:", error);
    res.status(500).json({ error: "Tarifni olishda xatolik" });
  }
};

const ALLOWED_LIMIT_KEYS = [
  "dailyRequests",
  "monthlyRequests",
  "maxTokensPerRequest",
  "rateLimitPerMinute",
  "maxFileUploadsPerMonth",
  "maxWebhooks",
  "maxApiKeys",
];

/**
 * requestBody dan Plan uchun xavfsiz maydonlarni ajratib oladi —
 * admin yubormasligi kerak bo'lgan maydonlar (_id, createdAt va h.k.)
 * tasodifan yozilib qolmasligi uchun.
 */
const pickPlanFields = (body) => {
  const fields = {};

  if (body.name !== undefined) fields.name = body.name;
  if (body.description !== undefined) fields.description = body.description;
  if (body.features !== undefined) {
    if (!Array.isArray(body.features)) {
      throw Object.assign(new Error("features massiv bo'lishi kerak"), { statusCode: 400 });
    }
    fields.features = body.features;
  }
  if (body.isActive !== undefined) fields.isActive = Boolean(body.isActive);
  if (body.isDefault !== undefined) fields.isDefault = Boolean(body.isDefault);
  if (body.sortOrder !== undefined) fields.sortOrder = Number(body.sortOrder);
  if (body.stripePriceId !== undefined) fields.stripePriceId = body.stripePriceId;

  if (body.price !== undefined) {
    if (typeof body.price !== "object" || body.price === null) {
      throw Object.assign(new Error("price obyekt bo'lishi kerak"), { statusCode: 400 });
    }
    fields.price = {};
    if (body.price.amount !== undefined) {
      const amount = Number(body.price.amount);
      if (Number.isNaN(amount) || amount < 0) {
        throw Object.assign(new Error("price.amount manfiy bo'lmagan son bo'lishi kerak"), {
          statusCode: 400,
        });
      }
      fields.price.amount = amount;
    }
    if (body.price.currency !== undefined) fields.price.currency = body.price.currency;
    if (body.price.interval !== undefined) {
      if (!["month", "year", "one_time"].includes(body.price.interval)) {
        throw Object.assign(
          new Error("price.interval 'month', 'year' yoki 'one_time' bo'lishi kerak"),
          { statusCode: 400 }
        );
      }
      fields.price.interval = body.price.interval;
    }
  }

  if (body.limits !== undefined) {
    if (typeof body.limits !== "object" || body.limits === null) {
      throw Object.assign(new Error("limits obyekt bo'lishi kerak"), { statusCode: 400 });
    }
    fields.limits = {};
    for (const key of ALLOWED_LIMIT_KEYS) {
      if (body.limits[key] !== undefined) {
        const value = Number(body.limits[key]);
        if (Number.isNaN(value)) {
          throw Object.assign(new Error(`limits.${key} son bo'lishi kerak`), { statusCode: 400 });
        }
        fields.limits[key] = value;
      }
    }
  }

  return fields;
};

exports.createPlan = async (req, res) => {
  try {
    const { slug } = req.body;

    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      return res.status(400).json({
        error: "slug talab qilinadi va faqat kichik harf, raqam, - yoki _ dan iborat bo'lishi kerak",
      });
    }

    if (!req.body.name) {
      return res.status(400).json({ error: "name talab qilinadi" });
    }

    if (!req.body.price?.amount && req.body.price?.amount !== 0) {
      return res.status(400).json({ error: "price.amount talab qilinadi" });
    }

    const existing = await Plan.findOne({ slug });
    if (existing) {
      return res.status(409).json({ error: `"${slug}" slug bilan tarif allaqachon mavjud` });
    }

    const fields = pickPlanFields(req.body);
    const plan = await Plan.create({ slug, ...fields });

    logger.info(`Admin ${req.userId} created plan "${slug}"`);
    res.status(201).json(plan);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error("Create plan error:", error);
    res.status(500).json({ error: "Tarif yaratishda xatolik" });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { slug } = req.params;

    // slug o'zgartirilishi taqiqlanadi — u User.tier va AIModel.tierAccess
    // ichida barqaror identifikator sifatida ishlatiladi. Nom o'zgarishi
    // mumkin, slug esa yo'q (aks holda mavjud foydalanuvchilar "yo'qolgan"
    // tarifda qolib ketadi).
    if (req.body.slug !== undefined && req.body.slug !== slug) {
      return res.status(400).json({
        error: "slug o'zgartirib bo'lmaydi — yangi tarif yarating va foydalanuvchilarni ko'chiring",
      });
    }

    const fields = pickPlanFields(req.body);

    const plan = await Plan.findOneAndUpdate(
      { slug },
      { $set: fields },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({ error: "Tarif topilmadi" });
    }

    logger.info(`Admin ${req.userId} updated plan "${slug}"`);
    res.json(plan);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error("Update plan error:", error);
    res.status(500).json({ error: "Tarifni yangilashda xatolik" });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { slug } = req.params;

    const usersOnPlan = await User.countDocuments({ tier: slug });
    if (usersOnPlan > 0) {
      return res.status(409).json({
        error: `Bu tarifda ${usersOnPlan} ta faol foydalanuvchi bor. Avval ularni boshqa tarifga ko'chiring yoki tarifni faqat o'chiring (isActive: false).`,
        activeUserCount: usersOnPlan,
      });
    }

    const plan = await Plan.findOneAndDelete({ slug });
    if (!plan) {
      return res.status(404).json({ error: "Tarif topilmadi" });
    }

    logger.info(`Admin ${req.userId} deleted plan "${slug}"`);
    res.json({ message: "Tarif o'chirildi" });
  } catch (error) {
    logger.error("Delete plan error:", error);
    res.status(500).json({ error: "Tarifni o'chirishda xatolik" });
  }
};

/**
 * Tarifni faollashtirish/o'chirish (soft — yangi obuna uchun ko'rinmay
 * qoladi, lekin mavjud foydalanuvchilarga ta'sir qilmaydi).
 */
exports.togglePlanStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const plan = await Plan.findOne({ slug });

    if (!plan) {
      return res.status(404).json({ error: "Tarif topilmadi" });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    logger.info(`Admin ${req.userId} ${plan.isActive ? "activated" : "deactivated"} plan "${slug}"`);
    res.json(plan);
  } catch (error) {
    logger.error("Toggle plan status error:", error);
    res.status(500).json({ error: "Tarif holatini almashtirishda xatolik" });
  }
};
