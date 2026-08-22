const Anthropic = require("@anthropic-ai/sdk");

/**
 * Anthropic (Claude) adapteri. SDK shakli OpenAI-uslubidan farq qiladi:
 *   - max_tokens har doim majburiy (default berilmasa xato beradi)
 *   - javob content massiv (blocks), matn olish uchun birlashtiriladi
 *   - streaming eventlar turlicha (content_block_delta va h.k.)
 */

const DEFAULT_MAX_TOKENS = 4096;

const createClient = (providerConfig) => {
  if (!providerConfig?.apiKey) return null;
  return new Anthropic({
    apiKey: providerConfig.apiKey,
    timeout: providerConfig.timeout || 120000,
  });
};

const extractText = (contentBlocks) =>
  contentBlocks
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

const chat = async (client, { model, prompt, maxTokens }) => {
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  return {
    response: extractText(message.content),
    tokensUsed: {
      input: message.usage?.input_tokens || 0,
      output: message.usage?.output_tokens || 0,
      total: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
    },
  };
};

const chatStream = async (client, { model, prompt, maxTokens, onChunk }) => {
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  stream.on("text", (textDelta) => {
    if (textDelta) onChunk(textDelta);
  });

  const finalMessage = await stream.finalMessage();

  return {
    tokensUsed: {
      input: finalMessage.usage?.input_tokens || 0,
      output: finalMessage.usage?.output_tokens || 0,
      total:
        (finalMessage.usage?.input_tokens || 0) + (finalMessage.usage?.output_tokens || 0),
    },
  };
};

module.exports = { createClient, chat, chatStream };
