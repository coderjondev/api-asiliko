const { getStripeClient, isBillingActive } = require("../../config/stripe");
const Subscription = require("../../models/Subscription");
const Plan = require("../../models/Plan");
const logger = require("../../utils/logger");

/**
 * Billing tizimi uchun asosiy biznes-mantiq. Har bir metod
 * isBillingActive() ni tekshiradi va o'chirilgan bo'lsa aniq xato
 * tashlaydi — controller shu xatoni 503 sifatida qaytaradi.
 *
 * ILGARI tariflar SystemConfig("billing").plans ichida qo'lda
 * kiritiladigan { pro: {priceId}, enterprise: {priceId} } shaklida edi
 * — faqat shu ikkitasi bilan ishlar edi. Endi to'liq Plan modeli
 * ishlatiladi (src/models/Plan.js), admin istalgan sondagi tarif
 * yaratishi mumkin.
 */

class BillingDisabledError extends Error {
  constructor() {
    super("To'lov tizimi hozircha o'chirilgan");
    this.statusCode = 503;
  }
}

const ensureActive = async () => {
  const active = await isBillingActive();
  if (!active) {
    throw new BillingDisabledError();
  }
  return getStripeClient();
};

/**
 * Berilgan slug bo'yicha faol (isActive=true) Plan hujjatini topadi va
 * uning Stripe price ID borligini tekshiradi. Slug — admin panelda
 * yaratilgan istalgan tarif bo'lishi mumkin, faqat "pro"/"enterprise"
 * bilan cheklanmaydi.
 */
const getPlanForCheckout = async (slug) => {
  const plan = await Plan.findOne({ slug, isActive: true });

  if (!plan) {
    const err = new Error(`"${slug}" nomli faol tarif topilmadi`);
    err.statusCode = 404;
    throw err;
  }

  if (!plan.stripePriceId) {
    const err = new Error(
      `"${slug}" tarifi uchun Stripe price ID sozlanmagan (admin panelda plan.stripePriceId to'ldirilishi kerak)`
    );
    err.statusCode = 400;
    throw err;
  }

  return plan;
};

/**
 * Foydalanuvchi uchun Stripe Checkout Session yaratadi va uning URL'ini
 * qaytaradi — frontend shu URL'ga redirect qiladi.
 */
const createCheckoutSession = async ({ user, tier, successUrl, cancelUrl }) => {
  const stripe = await ensureActive();
  const plan = await getPlanForCheckout(tier);

  let subscription = await Subscription.findOne({ userId: user._id });

  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(user._id) },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: plan.price.interval === "one_time" ? "payment" : "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(user._id), tier: plan.slug },
  });

  if (!subscription) {
    subscription = new Subscription({
      userId: user._id,
      stripeCustomerId: customerId,
      status: "none",
    });
  } else {
    subscription.stripeCustomerId = customerId;
  }
  await subscription.save();

  return { checkoutUrl: session.url, sessionId: session.id };
};

/**
 * Stripe Customer Portal session yaratadi — foydalanuvchi shu orqali
 * obunani o'zi bekor qilishi, to'lov usulini yangilashi mumkin.
 */
const createPortalSession = async ({ user, returnUrl }) => {
  const stripe = await ensureActive();

  const subscription = await Subscription.findOne({ userId: user._id });
  if (!subscription?.stripeCustomerId) {
    const err = new Error("Foydalanuvchi uchun Stripe mijoz topilmadi");
    err.statusCode = 404;
    throw err;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return { portalUrl: session.url };
};

/**
 * Joriy foydalanuvchining obuna holatini, shu bilan birga uning
 * tarifiga tegishli to'liq Plan tafsilotlarini (limits, features)
 * qaytaradi — frontend alohida so'rov yubormasdan hammasini oladi.
 */
const getSubscriptionStatus = async (userId) => {
  const [subscription, user] = await Promise.all([
    Subscription.findOne({ userId }),
    require("../../models/User").findById(userId).select("tier"),
  ]);

  const tierSlug = subscription?.tier || user?.tier || "free";
  const plan = await Plan.findOne({ slug: tierSlug });

  return {
    tier: tierSlug,
    status: subscription?.status || "none",
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    plan: plan
      ? {
          name: plan.name,
          price: plan.price,
          features: plan.features,
          limits: plan.limits,
        }
      : null,
  };
};

/**
 * Stripe webhook orqali kelgan hodisalarni qayta ishlaydi va
 * Subscription hujjatini + User.tier ni yangilaydi.
 * Webhook signature tekshiruvi controller darajasida bajariladi
 * (raw body kerak bo'lgani uchun), bu yerga signature allaqachon
 * tasdiqlangan `event` obyekti keladi.
 */
const handleWebhookEvent = async (event) => {
  const User = require("../../models/User");

  // Obuna faol bo'lmay qolganda foydalanuvchini qaytariladigan
  // standart (bepul) tarif — admin buni xohlagan slug bilan
  // sozlashi mumkin, agar "free" mavjud bo'lmasa isDefault=true
  // bo'lgan tarifni qidiramiz.
  const getFallbackTierSlug = async () => {
    const freePlan = await Plan.findOne({ slug: "free" });
    if (freePlan) return "free";
    const defaultPlan = await Plan.findOne({ isDefault: true });
    return defaultPlan?.slug || "free";
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier;
      if (!userId) break;

      const subscription = await Subscription.findOneAndUpdate(
        { userId },
        {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          tier: tier || (await getFallbackTierSlug()),
          status: "active",
          lastWebhookEvent: event.type,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      await User.findByIdAndUpdate(userId, { tier: subscription.tier });
      logger.info(`Billing: checkout completed for user ${userId}, tier=${subscription.tier}`);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const subscription = await Subscription.findOne({ stripeSubscriptionId: sub.id });
      if (!subscription) break;

      subscription.status = sub.status;
      subscription.currentPeriodEnd = new Date(sub.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = sub.cancel_at_period_end;
      subscription.lastWebhookEvent = event.type;
      subscription.lastSyncedAt = new Date();
      await subscription.save();

      // Obuna faol bo'lmay qolsa (masalan to'lov muvaffaqiyatsiz) —
      // foydalanuvchini standart (bepul) tarifga qaytaramiz.
      if (!["active", "trialing"].includes(sub.status)) {
        const fallback = await getFallbackTierSlug();
        await User.findByIdAndUpdate(subscription.userId, { tier: fallback });
      }

      logger.info(`Billing: subscription ${sub.id} updated to status=${sub.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const subscription = await Subscription.findOne({ stripeSubscriptionId: sub.id });
      if (!subscription) break;

      subscription.status = "canceled";
      subscription.lastWebhookEvent = event.type;
      subscription.lastSyncedAt = new Date();
      await subscription.save();

      const fallback = await getFallbackTierSlug();
      await User.findByIdAndUpdate(subscription.userId, { tier: fallback });
      logger.info(`Billing: subscription ${sub.id} canceled`);
      break;
    }

    default:
      logger.debug(`Billing: unhandled webhook event type ${event.type}`);
  }
};

module.exports = {
  BillingDisabledError,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  handleWebhookEvent,
};
