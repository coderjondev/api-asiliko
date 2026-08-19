const Webhook = require("../../models/Webhook");
const crypto = require("crypto");
const logger = require("../../utils/logger");

exports.createWebhook = async (req, res) => {
  try {
    const { name, url, events, headers } = req.body;

    if (!name || !url || !events || events.length === 0) {
      return res.status(400).json({ error: "Name, URL, and events are required" });
    }

    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await Webhook.create({
      userId: req.userId,
      name,
      url,
      events,
      secret,
      headers: headers || {},
    });

    logger.info(`User ${req.userId} created webhook ${webhook._id}`);
    res.status(201).json(webhook);
  } catch (error) {
    logger.error("Create webhook error:", error);
    res.status(500).json({ error: "Failed to create webhook" });
  }
};

exports.getWebhooks = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const webhooks = await Webhook.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Webhook.countDocuments({ userId: req.userId });

    res.json({
      webhooks,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error("Get webhooks error:", error);
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
};

exports.getWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.webhookId,
      userId: req.userId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json(webhook);
  } catch (error) {
    logger.error("Get webhook error:", error);
    res.status(500).json({ error: "Failed to fetch webhook" });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const { name, url, events, headers, isActive } = req.body;

    const webhook = await Webhook.findOne({
      _id: req.params.webhookId,
      userId: req.userId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    if (name) webhook.name = name;
    if (url) webhook.url = url;
    if (events) webhook.events = events;
    if (headers !== undefined) webhook.headers = headers;
    if (isActive !== undefined) webhook.isActive = isActive;

    await webhook.save();

    logger.info(`User ${req.userId} updated webhook ${webhook._id}`);
    res.json(webhook);
  } catch (error) {
    logger.error("Update webhook error:", error);
    res.status(500).json({ error: "Failed to update webhook" });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findOneAndDelete({
      _id: req.params.webhookId,
      userId: req.userId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    logger.info(`User ${req.userId} deleted webhook ${webhook._id}`);
    res.json({ message: "Webhook deleted successfully" });
  } catch (error) {
    logger.error("Delete webhook error:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
};

exports.regenerateSecret = async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.webhookId,
      userId: req.userId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    webhook.secret = crypto.randomBytes(32).toString("hex");
    await webhook.save();

    logger.info(`User ${req.userId} regenerated secret for webhook ${webhook._id}`);
    res.json({ secret: webhook.secret });
  } catch (error) {
    logger.error("Regenerate secret error:", error);
    res.status(500).json({ error: "Failed to regenerate secret" });
  }
};

exports.testWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.webhookId,
      userId: req.userId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const testPayload = {
      event: "webhook.test",
      data: { message: "This is a test webhook" },
      timestamp: new Date().toISOString(),
      webhookId: webhook._id,
    };

    const webhookService = require("../../utils/webhookService");
    await webhookService.callWebhook(webhook, "webhook.test", testPayload.data);

    res.json({ message: "Test webhook sent successfully" });
  } catch (error) {
    logger.error("Test webhook error:", error);
    res.status(500).json({ error: "Failed to test webhook" });
  }
};

exports.getWebhookStats = async (req, res) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.webhookId,
      userId: req.userId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json(webhook.stats);
  } catch (error) {
    logger.error("Get webhook stats error:", error);
    res.status(500).json({ error: "Failed to fetch webhook stats" });
  }
};
