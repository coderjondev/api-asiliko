const adminAiService = require("../services/adminAi.service");

const getAIConfig = async (req, res) => {
  try {
    const config = await adminAiService.getAIConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAIConfig = async (req, res) => {
  try {
    const config = await adminAiService.updateAIConfig(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const setDefaultProvider = async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ error: "Provider talab qilinadi" });
    }

    const config = await adminAiService.setDefaultProvider(provider);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAIConfig, updateAIConfig, setDefaultProvider };
