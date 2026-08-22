const Webhook = require("../models/Webhook");
const logger = require("./logger");
const crypto = require("crypto");
const { isUrlSafeForOutboundRequest } = require("./urlSafety");

class WebhookService {
  async triggerEvent(event, data) {
    try {
      const webhooks = await Webhook.find({
        events: event,
        isActive: true,
      });

      if (webhooks.length === 0) {
        logger.debug(`No webhooks registered for event: ${event}`);
        return;
      }

      logger.info(`Triggering ${webhooks.length} webhooks for event: ${event}`);

      const promises = webhooks.map((webhook) =>
        this.callWebhook(webhook, event, data)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      logger.error("Webhook trigger error:", error);
    }
  }

  async callWebhook(webhook, event, data) {
    // Har chaqiriqda qayta tekshiramiz (nafaqat webhook yaratilganda) —
    // chunki DNS rebinding orqali domain xavfsiz IP'dan keyinroq
    // xususiy/ichki IP'ga o'zgartirilishi mumkin.
    const urlCheck = await isUrlSafeForOutboundRequest(webhook.url);
    if (!urlCheck.safe) {
      logger.error(`Webhook ${webhook._id} bloklandi (xavfsiz emas URL): ${urlCheck.reason}`);
      webhook.stats.failedCalls += 1;
      webhook.stats.lastFailure = new Date();
      await webhook.save();
      return;
    }

    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhookId: webhook._id,
    };

    const signature = this.generateSignature(payload, webhook.secret);

    const headers = {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": event,
      "User-Agent": "Asiliko-Webhook/1.0",
      ...Object.fromEntries(webhook.headers || []),
    };

    let attempt = 0;
    const maxRetries = webhook.retryConfig.maxRetries || 3;
    const retryDelay = webhook.retryConfig.retryDelay || 1000;

    while (attempt <= maxRetries) {
      // Node native fetch "timeout" optionni tan olmaydi — AbortController
      // bilan qo'lda amalga oshiramiz, aks holda osilib qolgan endpoint
      // butun so'rovni cheksiz kutishga majbur qiladi.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 soniya

      try {
        webhook.stats.totalCalls += 1;
        webhook.stats.lastTriggered = new Date();

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          webhook.stats.successfulCalls += 1;
          webhook.stats.lastSuccess = new Date();
          await webhook.save();

          logger.info(`Webhook ${webhook._id} called successfully for event ${event}`);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        attempt += 1;
        const reason = error.name === "AbortError" ? "timeout (10s)" : error.message;
        logger.warn(
          `Webhook ${webhook._id} attempt ${attempt}/${maxRetries + 1} failed: ${reason}`
        );

        if (attempt > maxRetries) {
          webhook.stats.failedCalls += 1;
          webhook.stats.lastFailure = new Date();
          await webhook.save();

          logger.error(`Webhook ${webhook._id} failed after ${maxRetries + 1} attempts`);
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }

    await webhook.save();
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
  }

  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new WebhookService();
