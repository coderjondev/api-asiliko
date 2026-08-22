const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Google Gemini adapteri.
 */

const createClient = (providerConfig) => {
  if (!providerConfig?.apiKey) return null;
  return new GoogleGenerativeAI(providerConfig.apiKey);
};

const chat = async (client, { model, prompt }) => {
  const geminiModel = client.getGenerativeModel({ model });
  const result = await geminiModel.generateContent(prompt);
  const response = result.response.text();

  return {
    response,
    tokensUsed: {
      input: result.response.usageMetadata?.promptTokenCount || 0,
      output: result.response.usageMetadata?.candidatesTokenCount || 0,
      total: result.response.usageMetadata?.totalTokenCount || 0,
    },
  };
};

const chatStream = async (client, { model, prompt, onChunk }) => {
  const geminiModel = client.getGenerativeModel({ model });
  const result = await geminiModel.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const content = chunk.text();
    if (content) onChunk(content);
  }

  const finalResult = await result.response;

  return {
    tokensUsed: {
      input: finalResult.usageMetadata?.promptTokenCount || 0,
      output: finalResult.usageMetadata?.candidatesTokenCount || 0,
      total: finalResult.usageMetadata?.totalTokenCount || 0,
    },
  };
};

module.exports = { createClient, chat, chatStream };
