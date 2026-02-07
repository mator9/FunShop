const { createClient } = require('@libsql/client');
const path = require('path');

let client;

async function getDb() {
  if (!client) {
    // Use Turso cloud database in production, local SQLite file for development
    const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'shopping_lists.db')}`;
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await initializeDb();
  }
  return client;
}

async function initializeDb() {
  await client.execute('PRAGMA foreign_keys = ON');

  await client.batch([
    `CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      share_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT DEFAULT '1',
      category TEXT DEFAULT '',
      is_found INTEGER DEFAULT 0,
      found_by TEXT DEFAULT '',
      added_by TEXT DEFAULT 'Anonymous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_items_list_id ON items(list_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lists_share_code ON lists(share_code)`,
  ], 'write');
}

// List operations
async function createList(id, name, shareCode) {
  await client.execute({
    sql: 'INSERT INTO lists (id, name, share_code) VALUES (?, ?, ?)',
    args: [id, name, shareCode],
  });
  return getListById(id);
}

async function getListById(id) {
  const result = await client.execute({
    sql: 'SELECT * FROM lists WHERE id = ?',
    args: [id],
  });
  return result.rows[0] || null;
}

async function getListByShareCode(shareCode) {
  const result = await client.execute({
    sql: 'SELECT * FROM lists WHERE share_code = ?',
    args: [shareCode],
  });
  return result.rows[0] || null;
}

async function updateListName(id, name) {
  await client.execute({
    sql: 'UPDATE lists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [name, id],
  });
  return getListById(id);
}

async function deleteList(id) {
  const result = await client.execute({
    sql: 'DELETE FROM lists WHERE id = ?',
    args: [id],
  });
  return result;
}

// Item operations
async function addItem(id, listId, name, quantity, category, addedBy) {
  await client.execute({
    sql: 'INSERT INTO items (id, list_id, name, quantity, category, added_by) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, listId, name, quantity || '1', category || '', addedBy || 'Anonymous'],
  });
  await updateListTimestamp(listId);
  return getItemById(id);
}

async function getItemById(id) {
  const result = await client.execute({
    sql: 'SELECT * FROM items WHERE id = ?',
    args: [id],
  });
  return result.rows[0] || null;
}

async function getItemsByListId(listId) {
  const result = await client.execute({
    sql: 'SELECT * FROM items WHERE list_id = ? ORDER BY is_found ASC, created_at ASC',
    args: [listId],
  });
  return result.rows;
}

async function updateItem(id, updates) {
  const item = await getItemById(id);
  if (!item) return null;

  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.quantity !== undefined) { fields.push('quantity = ?'); values.push(updates.quantity); }
  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  if (updates.is_found !== undefined) { fields.push('is_found = ?'); values.push(updates.is_found ? 1 : 0); }
  if (updates.found_by !== undefined) { fields.push('found_by = ?'); values.push(updates.found_by); }

  if (fields.length === 0) return item;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await client.execute({
    sql: `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  });
  await updateListTimestamp(item.list_id);
  return getItemById(id);
}

async function deleteItem(id) {
  const item = await getItemById(id);
  if (!item) return null;
  await client.execute({
    sql: 'DELETE FROM items WHERE id = ?',
    args: [id],
  });
  await updateListTimestamp(item.list_id);
  return item;
}

async function updateListTimestamp(listId) {
  await client.execute({
    sql: 'UPDATE lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [listId],
  });
}

module.exports = {
  getDb,
  createList,
  getListById,
  getListByShareCode,
  updateListName,
  deleteList,
  addItem,
  getItemById,
  getItemsByListId,
  updateItem,
  deleteItem,
};
