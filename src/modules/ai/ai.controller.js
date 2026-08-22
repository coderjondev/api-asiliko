const aiService = require("./ai.service");

const chat = async (req, res) => {
  try {
    const { prompt, provider, model, stream } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: req.t("ai.prompt_required") });
    }

    // Handle streaming responses
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      try {
        await aiService.chatStream(req.userId, {
          prompt,
          provider,
          model,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          },
          onComplete: (result) => {
            res.write(`data: ${JSON.stringify({ type: "done", ...result })}\n\n`);
            res.end();
          },
          onError: (error) => {
            res.write(
              `data: ${JSON.stringify({ type: "error", error: translateServiceError(req, error) })}\n\n`
            );
            res.end();
          },
        });
      } catch (error) {
        res.write(
          `data: ${JSON.stringify({ type: "error", error: translateServiceError(req, error) })}\n\n`
        );
        res.end();
      }
      return;
    }

    // Handle non-streaming responses
    const result = await aiService.chat(req.userId, {
      prompt,
      provider,
      model,
      stream: false,
    });

    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: translateServiceError(req, error) });
  }
};

const getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await aiService.getHistory(req.userId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: req.t("common.internal_error") });
  }
};

/**
 * Foydalanuvchi javobga baho beradi: POST /api/v1/ai/:promptId/feedback
 * Body: { rating: "good" | "bad", comment?: string }
 */
const submitFeedback = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { rating, comment } = req.body;

    const updated = await aiService.submitFeedback(req.userId, promptId, { rating, comment });
    res.json({ message: req.t("ai.feedback_saved"), feedback: updated.feedback });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: translateServiceError(req, error) });
  }
};

/**
 * "Refresh" — javobni qayta generatsiya qilish: POST /api/v1/ai/:promptId/regenerate
 */
const regenerate = async (req, res) => {
  try {
    const { promptId } = req.params;
    const result = await aiService.regenerateResponse(req.userId, promptId);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: translateServiceError(req, error) });
  }
};

/**
 * Service qatlamida tashlangan xatoni tarjima qiladi. Agar xato
 * i18nKey bilan yaratilgan bo'lsa (structured error — pastga qarang),
 * shu kalit orqali tarjima qilinadi. Aks holda (masalan Mongoose yoki
 * kutilmagan xato) xom err.message ishlatiladi — bu ingliz tilida
 * qolishi mumkin, lekin xavfsizroq (noto'g'ri tarjima qilingan texnik
 * xatodan ko'ra).
 */
const translateServiceError = (req, error) => {
  if (error.i18nKey) {
    return req.t(error.i18nKey, error.i18nParams);
  }
  return error.message;
};

module.exports = { chat, getHistory, submitFeedback, regenerate };
