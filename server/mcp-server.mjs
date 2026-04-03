import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('./database');
const { parseChatToItems } = require('./chat-parser');
const crypto = require('crypto');

function generateId(length = 12) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

const server = new McpServer({
  name: 'funshop',
  version: '1.0.0',
});

// --- Tool: parse_chat ---
server.tool(
  'parse_chat',
  'Parse chat messages (WhatsApp, Telegram, plain text) into structured shopping list items',
  {
    text: z.string().describe('Raw chat text to parse'),
    provider: z.enum(['heuristic', 'anthropic', 'openai']).optional().describe('AI provider to use for parsing (default: heuristic)'),
  },
  async ({ text, provider }) => {
    const result = await parseChatToItems(text, { provider });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// --- Tool: create_list ---
server.tool(
  'create_list',
  'Create a new shopping list',
  {
    name: z.string().describe('Name for the new shopping list'),
  },
  async ({ name }) => {
    await db.getDb();
    const id = generateId(12);
    const shareCode = generateId(8);
    const list = await db.createList(id, name.trim(), shareCode);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(list, null, 2),
      }],
    };
  }
);

// --- Tool: add_items ---
server.tool(
  'add_items',
  'Add multiple items to an existing shopping list',
  {
    listId: z.string().describe('ID of the list to add items to'),
    items: z.array(z.object({
      name: z.string().describe('Item name'),
      quantity: z.string().optional().describe('Amount with optional unit (e.g. "2 kg", "500 g", "12")'),
    })).describe('Array of items to add'),
  },
  async ({ listId, items }) => {
    await db.getDb();
    const list = await db.getListById(listId);
    if (!list) {
      return {
        content: [{ type: 'text', text: 'Error: List not found' }],
        isError: true,
      };
    }

    const created = [];
    for (const entry of items) {
      const id = generateId(12);
      const item = await db.addItem(
        id, listId, entry.name.trim(),
        entry.quantity || '1', '', 'MCP'
      );
      created.push(item);
    }

    return {
      content: [{
        type: 'text',
        text: `Added ${created.length} items to list "${list.name}".\n\n${JSON.stringify(created, null, 2)}`,
      }],
    };
  }
);

// --- Tool: get_list ---
server.tool(
  'get_list',
  'Get a shopping list with all its items',
  {
    listId: z.string().describe('ID of the list to retrieve'),
  },
  async ({ listId }) => {
    await db.getDb();
    const list = await db.getListById(listId);
    if (!list) {
      return {
        content: [{ type: 'text', text: 'Error: List not found' }],
        isError: true,
      };
    }
    const items = await db.getItemsByListId(listId);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ ...list, items }, null, 2),
      }],
    };
  }
);

// --- Tool: parse_and_create ---
server.tool(
  'parse_and_create',
  'One-shot: parse chat text, create a new shopping list, and add all extracted items to it',
  {
    text: z.string().describe('Raw chat text to parse'),
    listName: z.string().describe('Name for the new shopping list'),
    provider: z.enum(['heuristic', 'anthropic', 'openai']).optional().describe('AI provider to use for parsing'),
  },
  async ({ text, listName, provider }) => {
    await db.getDb();

    const result = await parseChatToItems(text, { provider });
    if (!result.items || result.items.length === 0) {
      return {
        content: [{ type: 'text', text: 'No items could be extracted from the provided text.' }],
        isError: true,
      };
    }

    const listId = generateId(12);
    const shareCode = generateId(8);
    const list = await db.createList(listId, listName.trim(), shareCode);

    const created = [];
    for (const entry of result.items) {
      const id = generateId(12);
      const item = await db.addItem(
        id, listId, entry.name.trim(),
        entry.quantity || '1', '', 'MCP'
      );
      created.push(item);
    }

    return {
      content: [{
        type: 'text',
        text: `Created list "${list.name}" (ID: ${list.id}, share code: ${list.share_code}) with ${created.length} items.\n\n${JSON.stringify({ list, items: created }, null, 2)}`,
      }],
    };
  }
);

// --- Start ---
async function main() {
  await db.getDb();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
