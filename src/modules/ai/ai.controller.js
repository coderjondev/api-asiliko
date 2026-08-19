const aiService = require("./ai.service");

const chat = async (req, res) => {
  try {
    const { prompt, provider, model, stream } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt talab qilinadi" });
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
            res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
            res.end();
          },
        });
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
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
    res.status(500).json({ error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await aiService.getHistory(req.userId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { chat, getHistory };
