const aiService = require("./ai.service");

const chat = async (req, res) => {
  try {
    const { prompt, provider, model, stream } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt talab qilinadi" });
    }

    const result = await aiService.chat(req.userId, {
      prompt,
      provider,
      model,
      stream,
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
