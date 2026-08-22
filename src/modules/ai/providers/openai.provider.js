const OpenAI = require("openai");

/**
 * OpenAI adapteri (GPT-4o va h.k.). DeepSeek adapteridan farqi —
 * baseURL berilmaydi (standart OpenAI endpoint ishlatiladi).
 */

const createClient = (providerConfig) => {
  if (!providerConfig?.apiKey) return null;
  return new OpenAI({
    apiKey: providerConfig.apiKey,
    timeout: providerConfig.timeout || 120000,
  });
};

const chat = async (client, { model, prompt, maxTokens }) => {
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    stream: false,
  });

  return {
    response: completion.choices[0].message.content,
    tokensUsed: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
      total: completion.usage?.total_tokens || 0,
    },
  };
};

const chatStream = async (client, { model, prompt, maxTokens, onChunk }) => {
  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    stream: true,
  });

  let tokensUsed = { input: 0, output: 0, total: 0 };

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) onChunk(content);

    if (chunk.usage) {
      tokensUsed = {
        input: chunk.usage.prompt_tokens || 0,
        output: chunk.usage.completion_tokens || 0,
        total: chunk.usage.total_tokens || 0,
      };
    }
  }

  return { tokensUsed };
};

module.exports = { createClient, chat, chatStream };
