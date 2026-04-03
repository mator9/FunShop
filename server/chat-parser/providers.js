const SYSTEM_PROMPT = `You are a shopping list parser. Given raw text (often copied from a group chat like WhatsApp or Telegram), extract shopping/grocery items.

Return ONLY a JSON array of objects with these fields:
- "name": item name (string, required)
- "quantity": amount with optional unit (string, default "1")

Rules:
- Ignore greetings, questions, timestamps, sender names, URLs, and media placeholders.
- Merge duplicate items by summing quantities when units match.
- Keep item names concise and normalized (e.g. "2 kg of tomatoes" -> name: "Tomatoes", quantity: "2 kg").
- Extract amounts and units into the quantity field (e.g. "500g rice" -> name: "Rice", quantity: "500 g").
- Respond with ONLY the JSON array, no markdown fences or explanation.`;

async function parseWithAnthropic(rawText) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    throw new Error('Install @anthropic-ai/sdk to use the Anthropic provider: npm install @anthropic-ai/sdk');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: rawText }],
  });

  const text = response.content[0]?.text || '[]';
  return JSON.parse(text);
}

async function parseWithOpenAI(rawText) {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch {
    throw new Error('Install openai to use the OpenAI provider: npm install openai');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawText },
    ],
  });

  const text = response.choices[0]?.message?.content || '[]';
  return JSON.parse(text);
}

const PROVIDERS = {
  anthropic: parseWithAnthropic,
  openai: parseWithOpenAI,
};

async function parseWithAI(rawText, providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown AI provider "${providerName}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  const items = await provider(rawText);

  if (!Array.isArray(items)) {
    throw new Error('AI provider returned invalid response (expected JSON array)');
  }

  return items.map((item) => ({
    name: String(item.name || '').trim(),
    quantity: String(item.quantity || '1').trim(),
  })).filter((item) => item.name.length > 0);
}

module.exports = { parseWithAI };
