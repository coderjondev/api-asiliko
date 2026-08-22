const User = require("../../../models/User");
const Subscription = require("../../../models/Subscription");
const Plan = require("../../../models/Plan");
const Prompt = require("../../../models/Prompt");
const RequestLog = require("../../../models/RequestLog");
const logger = require("../../../utils/logger");

/**
 * Advanced Analytics — admin panel uchun to'rtta bo'lim:
 *   1. Revenue (daromad, MRR, tarif bo'yicha taqsimot)
 *   2. Usage (so'rovlar hajmi, xatolik darajasi, javob vaqti)
 *   3. User growth (ro'yxatdan o'tish trendi, faollik)
 *   4. Model costs (AI provider/model bo'yicha xarajat va token)
 *
 * Barchasi MongoDB aggregation pipeline orqali hisoblanadi — alohida
 * "analytics" jadvali/keshi yo'q (hozircha), har so'rov real vaqtda
 * hisoblanadi. Katta ma'lumot hajmida (millionlab Prompt/RequestLog
 * yozuvi) bu sekinlashishi mumkin — RequestLog allaqachon 30 kunlik TTL
 * bilan cheklangan (index'ga qarang), Prompt uchun ham xohlasangiz
 * shunga o'xshash cheklov qo'shish mumkin.
 */

/**
 * Revenue analytics: joriy MRR (Monthly Recurring Revenue), tarif
 * bo'yicha foydalanuvchi/daromad taqsimoti, va oxirgi N oylik trend
 * (yangi obunalar soni oy bo'yicha — Subscription.createdAt asosida).
 *
 * ESLATMA: bu haqiqiy to'langan summalarni emas, balki joriy faol
 * obunalarning "agar shu tarifda qolsa, oyiga qancha to'lashi kerak"
 * degan hisobini beradi (Plan.price.amount asosida) — Stripe hali
 * ulanmagan (disabled) holatda ham ishlashi uchun shunday qilingan.
 * Stripe yoqilgach, buni haqiqiy invoice ma'lumotlari bilan
 * aniqlashtirish tavsiya etiladi (Stripe Invoice API).
 */
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 24);

    const plans = await Plan.find({});
    const planBySlug = Object.fromEntries(plans.map((p) => [p.slug, p]));

    // Tarif bo'yicha faol foydalanuvchilar soni
    const tierCounts = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$tier", count: { $sum: 1 } } },
    ]);

    let mrr = 0;
    const byPlan = tierCounts.map(({ _id: slug, count }) => {
      const plan = planBySlug[slug];
      if (!plan) {
        // Foydalanuvchi tier'i o'chirilgan yoki hech qachon mavjud
        // bo'lmagan Plan'ga ishora qilishi mumkin (masalan eski
        // "enterprise" yozuvi, Plan o'chirilgandan keyin qolgan).
        return { slug, planName: null, userCount: count, monthlyRevenue: 0, warning: "Plan topilmadi" };
      }

      // Faqat oylik/yillik takrorlanuvchi tariflar MRR'ga qo'shiladi;
      // one_time to'lovlar MRR emas.
      let monthlyAmount = 0;
      if (plan.price.interval === "month") monthlyAmount = plan.price.amount;
      else if (plan.price.interval === "year") monthlyAmount = plan.price.amount / 12;

      const monthlyRevenue = monthlyAmount * count;
      mrr += monthlyRevenue;

      return {
        slug,
        planName: plan.name,
        userCount: count,
        pricePerUser: plan.price.amount,
        interval: plan.price.interval,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      };
    });

    // Oylik trend: oxirgi N oyda nechta yangi obuna (Subscription
    // hujjati) yaratilgan — tekin/hech qachon obuna bo'lmagan
    // foydalanuvchilar bu yerga kirmaydi, chunki ular uchun
    // Subscription hujjati umuman yaratilmagan bo'lishi mumkin.
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - months);

    const monthlyTrend = await Subscription.aggregate([
      { $match: { createdAt: { $gte: monthsAgo }, status: { $in: ["active", "trialing"] } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          newSubscriptions: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100, // Annual Recurring Revenue taxmini
      byPlan,
      monthlyTrend: monthlyTrend.map((m) => ({
        year: m._id.year,
        month: m._id.month,
        newSubscriptions: m.newSubscriptions,
      })),
      note: "MRR joriy faol foydalanuvchilar va Plan narxlari asosida hisoblangan taxmin — Stripe yoqilgach haqiqiy invoice ma'lumotlari bilan aniqlashtiring.",
    });
  } catch (error) {
    logger.error("Revenue analytics error:", error);
    res.status(500).json({ error: "Daromad analitikasini olishda xatolik" });
  }
};

/**
 * Usage analytics: RequestLog asosida kunlik so'rovlar soni, xatolik
 * darajasi (statusCode >= 400), va o'rtacha javob vaqti trendi.
 */
exports.getUsageAnalytics = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [dailyTrend, overview] = await Promise.all([
      RequestLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            totalRequests: { $sum: 1 },
            errorRequests: {
              $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] },
            },
            avgResponseTime: { $avg: "$responseTime" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),
      RequestLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            errorRequests: { $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] } },
            avgResponseTime: { $avg: "$responseTime" },
            maxResponseTime: { $max: "$responseTime" },
            minResponseTime: { $min: "$responseTime" },
          },
        },
      ]),
    ]);

    const summary = overview[0] || {
      totalRequests: 0,
      errorRequests: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
    };

    res.json({
      period: { days, since },
      overview: {
        totalRequests: summary.totalRequests,
        errorRequests: summary.errorRequests,
        errorRate:
          summary.totalRequests > 0
            ? Math.round((summary.errorRequests / summary.totalRequests) * 10000) / 100
            : 0,
        avgResponseTimeMs: Math.round((summary.avgResponseTime || 0) * 100) / 100,
        maxResponseTimeMs: summary.maxResponseTime || 0,
        minResponseTimeMs: summary.minResponseTime || 0,
      },
      dailyTrend: dailyTrend.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
        totalRequests: d.totalRequests,
        errorRequests: d.errorRequests,
        errorRate:
          d.totalRequests > 0 ? Math.round((d.errorRequests / d.totalRequests) * 10000) / 100 : 0,
        avgResponseTimeMs: Math.round((d.avgResponseTime || 0) * 100) / 100,
      })),
    });
  } catch (error) {
    logger.error("Usage analytics error:", error);
    res.status(500).json({ error: "Ishlatilish analitikasini olishda xatolik" });
  }
};

/**
 * User growth: kunlik/oylik ro'yxatdan o'tish soni, va oddiy retention
 * ko'rsatkichi (oxirgi 7/30 kun ichida kamida bitta Prompt yaratgan
 * foydalanuvchilar ulushi — "faol foydalanuvchi" degan taxminiy o'lchov).
 */
exports.getUserGrowthAnalytics = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 24);
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - months);

    const [signupTrend, totalUsers, activeLast7d, activeLast30d] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: monthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            newUsers: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      User.countDocuments(),
      Prompt.distinct("userId", {
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Prompt.distinct("userId", {
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      totalUsers,
      activeUsers: {
        last7Days: activeLast7d.length,
        last30Days: activeLast30d.length,
      },
      retentionRate30d:
        totalUsers > 0 ? Math.round((activeLast30d.length / totalUsers) * 10000) / 100 : 0,
      signupTrend: signupTrend.map((s) => ({
        year: s._id.year,
        month: s._id.month,
        newUsers: s.newUsers,
      })),
      note: "'Faol foydalanuvchi' — shu davrda kamida 1 marta AI so'rov (Prompt) yaratgan foydalanuvchi sifatida hisoblangan taxminiy o'lchov.",
    });
  } catch (error) {
    logger.error("User growth analytics error:", error);
    res.status(500).json({ error: "Foydalanuvchi o'sishi analitikasini olishda xatolik" });
  }
};

/**
 * Model costs: Prompt.tokensUsed va AIModel.pricing asosida provider/model
 * bo'yicha taxminiy xarajat. Pricing AIModel hujjatida $/1M token
 * ko'rinishida saqlanadi deb faraz qilinadi (adminModel.controller.js
 * dagi seed misollariga qarang: input/output alohida narx).
 */
exports.getModelCostAnalytics = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const AIModel = require("../../../models/AIModel");

    const usage = await Prompt.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { provider: "$provider", model: "$model" },
          totalRequests: { $sum: 1 },
          totalInputTokens: { $sum: "$tokensUsed.input" },
          totalOutputTokens: { $sum: "$tokensUsed.output" },
          totalTokens: { $sum: "$tokensUsed.total" },
        },
      },
      { $sort: { totalTokens: -1 } },
    ]);

    // Har bir model uchun narx ma'lumotini qo'shib, taxminiy xarajatni
    // hisoblaymiz. AIModel topilmasa (masalan model keyinchalik
    // o'chirilgan bo'lsa), xarajat null qaytariladi — 0 emas, chunki 0
    // "bepul" degan noto'g'ri xulosaga olib kelishi mumkin.
    const results = await Promise.all(
      usage.map(async (u) => {
        const modelDoc = await AIModel.findOne({ modelId: u._id.model });
        let estimatedCost = null;

        if (modelDoc?.pricing) {
          const inputCost = ((u.totalInputTokens || 0) / 1_000_000) * (modelDoc.pricing.input || 0);
          const outputCost =
            ((u.totalOutputTokens || 0) / 1_000_000) * (modelDoc.pricing.output || 0);
          estimatedCost = Math.round((inputCost + outputCost) * 100) / 100;
        }

        return {
          provider: u._id.provider,
          model: u._id.model,
          totalRequests: u.totalRequests,
          totalInputTokens: u.totalInputTokens || 0,
          totalOutputTokens: u.totalOutputTokens || 0,
          totalTokens: u.totalTokens || 0,
          estimatedCostUsd: estimatedCost,
        };
      })
    );

    const totalEstimatedCost = results.reduce((sum, r) => sum + (r.estimatedCostUsd || 0), 0);

    res.json({
      period: { days, since },
      totalEstimatedCostUsd: Math.round(totalEstimatedCost * 100) / 100,
      byModel: results,
      note: "Xarajat AIModel.pricing ($/1M token) asosidagi taxmin — provayderning haqiqiy hisob-fakturasi bilan farq qilishi mumkin.",
    });
  } catch (error) {
    logger.error("Model cost analytics error:", error);
    res.status(500).json({ error: "Model xarajat analitikasini olishda xatolik" });
  }
};
