const { parseWithHeuristic } = require('./heuristic');
const { parseWithAI } = require('./providers');

async function parseChatToItems(rawText, options = {}) {
  const provider = options.provider || process.env.AI_PROVIDER || 'heuristic';

  if (provider === 'heuristic') {
    return parseWithHeuristic(rawText);
  }

  const items = await parseWithAI(rawText, provider);
  return { items, detectedFormat: 'ai' };
}

module.exports = { parseChatToItems };
