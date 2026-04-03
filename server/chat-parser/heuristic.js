// WhatsApp: [DD/MM/YYYY, HH:MM:SS] Sender: message
// WhatsApp alt: DD/MM/YYYY, HH:MM - Sender: message
const WHATSAPP_RE = /^\[?\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}[\s,]+\d{1,2}:\d{2}(?::\d{2})?\]?\s*[-–]?\s*.+?:\s*/;

// Telegram: [DD.MM.YYYY HH:MM] Sender:\n or similar
const TELEGRAM_RE = /^\[?\d{1,2}\.\d{1,2}\.\d{2,4}\s+\d{1,2}:\d{2}\]?\s*.+?:?\s*/;

// Bullet / numbered list prefixes
const LIST_PREFIX_RE = /^(?:\s*[-•*▸▹➜➤→]\s*|\s*\d+[.)]\s*)/;

// Lines that are clearly not shopping items
const NOISE_PATTERNS = [
  /^<media\s+omitted>$/i,
  /^<.+?\s+omitted>$/i,
  /^\s*https?:\/\//i,
  /^this message was deleted$/i,
  /^you deleted this message$/i,
  /^missed (voice|video) call$/i,
  /^\s*$/,
];

const GREETING_WORDS = /\b(hi|hey|hello|hola|yo|sup|gm|gn|thanks|thank\s*you|thx|ok|okay|sure|yes|no|yep|nope|bye|see\s*ya|lol|haha|hehe|lmao|omg|wow|cool|nice|great|perfect|done|alright|np|no\s*problem|good\s*(morning|afternoon|evening|night)|sounds\s*good|got\s*it|on\s*it|will\s*do|roger)\b/i;
const GREETING_RE = new RegExp(
  '^(' +
    '[\\s!.?👍👌✅❤️🙏🎉😊]*' +
    GREETING_WORDS.source +
    '[\\s!.?👍👌✅❤️🙏🎉😊]*' +
  ')+$',
  'i'
);

const QUESTION_RE = /\?\s*$/;

// Conversational prefixes that appear before actual items in chat messages
const CONVERSATIONAL_PREFIX_RE = /^(?:we\s+need|i\s+need|(?:can|could)\s+(?:you|we|someone)\s+(?:get|buy|grab|pick\s*up)|(?:please|pls)\s+(?:get|buy|grab|add)|(?:don'?t\s+forget|remember)\s+(?:to\s+(?:get|buy|grab))?\s*|also\s+|and\s+|(?:get|buy|grab|add)\s+(?:some\s+)?)/i;

// Quantity patterns, ordered most-specific-first
const QTY_PATTERNS = [
  // "2 kg tomatoes", "500g rice", "1.5 lbs chicken"
  { re: /^(\d+(?:[.,]\d+)?)\s*(kg|g|lb|lbs|oz|ml|l|litre|liter|gallon|gal)\b\s+(.+)$/i, qtyIdx: 1, unitIdx: 2, nameIdx: 3 },
  // "tomatoes 2 kg", "rice 500g"
  { re: /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|lb|lbs|oz|ml|l|litre|liter|gallon|gal)\s*$/i, nameIdx: 1, qtyIdx: 2, unitIdx: 3 },
  // "2x tomatoes", "3 x eggs", "eggs x12"
  { re: /^(\d+)\s*x\s+(.+)$/i, qtyIdx: 1, nameIdx: 2 },
  { re: /^(.+?)\s*x\s*(\d+)\s*$/i, nameIdx: 1, qtyIdx: 2 },
  // "2 tomatoes", "12 eggs" (number at start, at least 2 chars for name)
  { re: /^(\d+)\s+(.{2,})$/i, qtyIdx: 1, nameIdx: 2 },
];

function detectFormat(lines) {
  let whatsappCount = 0;
  let telegramCount = 0;
  const sample = lines.slice(0, Math.min(lines.length, 20));

  for (const line of sample) {
    if (WHATSAPP_RE.test(line)) whatsappCount++;
    else if (TELEGRAM_RE.test(line)) telegramCount++;
  }

  if (whatsappCount >= 2) return 'whatsapp';
  if (telegramCount >= 2) return 'telegram';
  return 'plain';
}

function stripChatPrefix(line, format) {
  if (format === 'whatsapp') return line.replace(WHATSAPP_RE, '');
  if (format === 'telegram') return line.replace(TELEGRAM_RE, '');
  return line.replace(LIST_PREFIX_RE, '');
}

function isNoise(text) {
  if (NOISE_PATTERNS.some((re) => re.test(text))) return true;
  if (GREETING_RE.test(text)) return true;
  if (QUESTION_RE.test(text)) return true;
  if (text.length < 2 || text.length > 200) return true;
  return false;
}

function extractQuantity(text) {
  for (const pattern of QTY_PATTERNS) {
    const m = text.match(pattern.re);
    if (m) {
      const rawQty = m[pattern.qtyIdx];
      const unit = pattern.unitIdx ? m[pattern.unitIdx] : '';
      const name = m[pattern.nameIdx].trim();
      if (!name) continue;
      const quantity = unit ? `${rawQty} ${unit}` : rawQty;
      return { name, quantity };
    }
  }
  return { name: text, quantity: '1' };
}

function deduplicate(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (map.has(key)) {
      const existing = map.get(key);
      const a = parseFloat(existing.quantity) || 0;
      const b = parseFloat(item.quantity) || 0;
      if (a > 0 && b > 0 && existing.quantity.replace(/[\d.,\s]/g, '') === item.quantity.replace(/[\d.,\s]/g, '')) {
        existing.quantity = String(a + b) + (existing.quantity.replace(/[\d.,\s]/g, '') ? ' ' + existing.quantity.replace(/[\d.,\s]/g, '') : '');
      }
    } else {
      map.set(key, { ...item });
    }
  }
  return Array.from(map.values());
}

function parseWithHeuristic(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { items: [], detectedFormat: 'unknown' };
  }

  const lines = rawText.split(/\r?\n/);
  const format = detectFormat(lines);

  const items = [];
  for (const line of lines) {
    let text = stripChatPrefix(line, format).trim();
    if (!text) continue;

    // Handle comma-separated and "and"-separated items within a single line
    const parts = text.includes(',') || /\band\b/i.test(text)
      ? text.split(/,|\band\b/i).map((s) => s.trim()).filter(Boolean)
      : [text];

    for (let part of parts) {
      if (isNoise(part)) continue;
      part = part.replace(CONVERSATIONAL_PREFIX_RE, '').trim();
      if (!part || isNoise(part)) continue;
      const { name, quantity } = extractQuantity(part);
      items.push({ name, quantity });
    }
  }

  return { items: deduplicate(items), detectedFormat: format };
}

module.exports = { parseWithHeuristic };
