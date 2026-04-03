/**
 * Chat message parser — extracts shopping/task items from pasted group chat text.
 *
 * Supported formats:
 *   - WhatsApp  "[DD/MM/YYYY, HH:MM:SS] Sender: message"
 *   - Telegram  "Sender, [DD.MM.YYYY HH:MM]"
 *   - Plain lists: bullet points (- / * / •), numbered (1. / 1)), comma-separated
 *   - Free-form multi-line text (one item per non-empty line)
 */

// WhatsApp: [12/03/2025, 14:05:32] John: milk
// Also handles US-style dates and 12h clocks with AM/PM
const WHATSAPP_RE =
  /^\[?\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\]?\s*-?\s*([^:]+):\s*(.+)$/;

// Telegram: "John Doe, [04.01.2025 09:12]"  (next line is the message)
const TELEGRAM_HEADER_RE =
  /^(.+),\s*\[\d{1,2}\.\d{1,2}\.\d{2,4}\s+\d{1,2}:\d{2}\]$/;

// Common list-item prefixes
const LIST_PREFIX_RE = /^(?:[-*•–—]\s+|\d+[.)]\s+)/;

// Quantity patterns like "2x ", "x3 ", "2 kg ", "500g " at the start or end
const QTY_START_RE = /^(\d+(?:\.\d+)?)\s*[xX×]?\s+/;
const QTY_END_RE = /\s+[xX×]\s*(\d+(?:\.\d+)?)$/;
const QTY_UNIT_RE = /^(\d+(?:\.\d+)?)\s*(kg|g|lb|lbs|oz|ml|l|pcs?|pack|packs|dozen|dz|bunch|bunches|can|cans|box|boxes|bag|bags|bottle|bottles|jar|jars|loaf|loaves)\b\s*/i;

// Conversational prefixes to strip from message bodies
const CONVERSATIONAL_PREFIX_RE =
  /^(we need|i need|don'?t forget|please get|can you get|also get|get me|buy|grab|pick up|remember to get|we also need|and also|also)\s+/i;

// Leading "And " at the start of a line
const AND_PREFIX_RE = /^and\s+/i;

// Lines that are almost certainly NOT items
const NOISE_RE =
  /^(https?:\/\/|this message was deleted|<media omitted>|you (added|removed|left|created|changed)|end-to-end encrypted|messages and calls are|waiting for this message)/i;

const CATEGORY_KEYWORDS = {
  Produce: [
    'apple', 'banana', 'orange', 'tomato', 'potato', 'onion', 'garlic',
    'lettuce', 'carrot', 'broccoli', 'spinach', 'pepper', 'cucumber',
    'avocado', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry',
    'mango', 'pineapple', 'watermelon', 'peach', 'pear', 'celery',
    'mushroom', 'corn', 'zucchini', 'kale', 'ginger', 'herbs', 'basil',
    'cilantro', 'parsley', 'mint', 'fruit', 'vegetable', 'salad',
  ],
  Dairy: [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'eggs',
    'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan',
  ],
  Meat: [
    'chicken', 'beef', 'pork', 'turkey', 'steak', 'ground meat', 'sausage',
    'bacon', 'ham', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'meat',
  ],
  Bakery: [
    'bread', 'bagel', 'croissant', 'muffin', 'roll', 'bun', 'cake',
    'pie', 'tortilla', 'pita', 'baguette', 'donut', 'pastry',
  ],
  Frozen: [
    'frozen', 'ice cream', 'pizza', 'fries', 'ice',
  ],
  Beverages: [
    'water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'drink',
    'cola', 'sprite', 'energy drink', 'sparkling',
  ],
  Snacks: [
    'chips', 'crackers', 'cookies', 'popcorn', 'nuts', 'candy', 'chocolate',
    'granola', 'pretzels', 'snack', 'gum',
  ],
  'Canned Goods': [
    'canned', 'beans', 'soup', 'tuna can', 'tomato sauce', 'paste',
    'coconut milk',
  ],
  Household: [
    'paper towel', 'toilet paper', 'trash bag', 'detergent', 'soap',
    'sponge', 'bleach', 'foil', 'wrap', 'ziplock', 'battery', 'batteries',
    'light bulb', 'candle',
  ],
  'Personal Care': [
    'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant',
    'lotion', 'sunscreen', 'razor', 'tissue', 'cotton',
  ],
};

function guessCategory(itemName) {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      return re.test(lower);
    })) {
      return category;
    }
  }
  return '';
}

function extractQuantity(text) {
  let name = text;
  let quantity = '1';

  const unitMatch = name.match(QTY_UNIT_RE);
  if (unitMatch) {
    quantity = `${unitMatch[1]} ${unitMatch[2]}`;
    name = name.slice(unitMatch[0].length);
  } else {
    const startMatch = name.match(QTY_START_RE);
    if (startMatch) {
      quantity = startMatch[1];
      name = name.slice(startMatch[0].length);
    } else {
      const endMatch = name.match(QTY_END_RE);
      if (endMatch) {
        quantity = endMatch[1];
        name = name.slice(0, -endMatch[0].length);
      }
    }
  }

  return { name: name.trim(), quantity };
}

function cleanLine(line) {
  let cleaned = line.trim();
  if (!cleaned) return '';

  cleaned = cleaned.replace(LIST_PREFIX_RE, '');
  cleaned = cleaned.trim();

  if (cleaned.length < 1 || cleaned.length > 200) return '';
  if (NOISE_RE.test(cleaned)) return '';

  // Strip conversational prefixes so "We need milk" becomes "milk"
  cleaned = cleaned.replace(CONVERSATIONAL_PREFIX_RE, '');
  cleaned = cleaned.replace(AND_PREFIX_RE, '');
  cleaned = cleaned.trim();

  if (!cleaned) return '';
  return cleaned;
}

/**
 * Parse raw chat/text input and return an array of extracted items.
 * Each item: { name: string, quantity: string, category: string, sender: string }
 */
function parseChatMessages(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/);
  const rawItems = [];

  let telegramSender = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      telegramSender = null;
      continue;
    }

    // Try WhatsApp format
    const waMatch = trimmed.match(WHATSAPP_RE);
    if (waMatch) {
      const sender = waMatch[1].trim();
      const msgBody = waMatch[2].trim();
      if (!NOISE_RE.test(msgBody)) {
        const subItems = splitMultipleItems(msgBody);
        for (const sub of subItems) {
          rawItems.push({ text: sub, sender });
        }
      }
      telegramSender = null;
      continue;
    }

    // Try Telegram header
    const tgMatch = trimmed.match(TELEGRAM_HEADER_RE);
    if (tgMatch) {
      telegramSender = tgMatch[1].trim();
      continue;
    }

    // Telegram body line (follows a header)
    if (telegramSender) {
      if (!NOISE_RE.test(trimmed)) {
        const subItems = splitMultipleItems(trimmed);
        for (const sub of subItems) {
          rawItems.push({ text: sub, sender: telegramSender });
        }
      }
      telegramSender = null;
      continue;
    }

    // Plain list / free-form line
    if (!NOISE_RE.test(trimmed)) {
      const subItems = splitMultipleItems(trimmed);
      for (const sub of subItems) {
        rawItems.push({ text: sub, sender: '' });
      }
    }
  }

  // Deduplicate and build final items
  const seen = new Set();
  const items = [];

  for (const raw of rawItems) {
    const cleaned = cleanLine(raw.text);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const { name, quantity } = extractQuantity(cleaned);
    if (!name) continue;

    items.push({
      name,
      quantity,
      category: guessCategory(name),
      sender: raw.sender,
    });
  }

  return items;
}

/**
 * Split a single message body that may list multiple items separated by
 * commas, "and", newlines, or semicolons.
 */
function splitMultipleItems(text) {
  const items = text
    .split(/[,;\n]|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 200);

  if (items.length <= 1) return [text.trim()];

  const allShort = items.every((it) => it.split(/\s+/).length <= 6);
  return allShort ? items : [text.trim()];
}

module.exports = { parseChatMessages };
