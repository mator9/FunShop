const { createClient } = require('@libsql/client');
const path = require('path');

let client;
let initPromise;

async function getDb() {
  if (!initPromise) {
    initPromise = (async () => {
      // Use Turso cloud database in production, local SQLite file for development
      const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'shopping_lists.db')}`;
      client = createClient({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      await initializeDb();
    })();
  }
  await initPromise;
  return client;
}

async function initializeDb() {
  // Note: PRAGMA foreign_keys = ON is session-scoped and does NOT persist
  // across Turso HTTP requests, so ON DELETE CASCADE cannot be relied upon.
  // Cascading deletes are handled explicitly in deleteList() instead.
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
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_items_list_id ON items(list_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lists_share_code ON lists(share_code)`,
  ], 'write');

  // Migrate existing databases: add sort_order column if it doesn't exist.
  // CREATE TABLE IF NOT EXISTS won't alter an existing table, so we need
  // an explicit ALTER TABLE for databases created before this feature.
  await migrateAddSortOrder();
}

async function migrateAddSortOrder() {
  try {
    // Check if column already exists by querying table info
    const tableInfo = await client.execute("PRAGMA table_info(items)");
    const hasSortOrder = tableInfo.rows.some((row) => row.name === 'sort_order');
    if (hasSortOrder) return;

    // Add the column and backfill existing items with order based on created_at
    await client.execute('ALTER TABLE items ADD COLUMN sort_order INTEGER DEFAULT 0');

    // Backfill sort_order for existing items, ordered by created_at within each list
    const lists = await client.execute('SELECT DISTINCT list_id FROM items');
    for (const row of lists.rows) {
      const listItems = await client.execute({
        sql: 'SELECT id FROM items WHERE list_id = ? ORDER BY created_at ASC',
        args: [row.list_id],
      });
      const updates = listItems.rows.map((item, index) => ({
        sql: 'UPDATE items SET sort_order = ? WHERE id = ?',
        args: [index, item.id],
      }));
      if (updates.length > 0) {
        await client.batch(updates, 'write');
      }
    }

    console.log('Migration complete: added sort_order column to items table');
  } catch (err) {
    // If PRAGMA table_info is not supported (some Turso configurations),
    // try the ALTER TABLE directly and ignore "duplicate column" errors
    if (err.message && err.message.includes('duplicate column')) {
      return; // Column already exists, nothing to do
    }
    console.error('Migration warning (sort_order):', err.message);
  }
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
  // Explicitly delete items first because PRAGMA foreign_keys = ON
  // does not persist across Turso HTTP requests (ON DELETE CASCADE won't fire).
  await client.batch([
    { sql: 'DELETE FROM items WHERE list_id = ?', args: [id] },
    { sql: 'DELETE FROM lists WHERE id = ?', args: [id] },
  ], 'write');
}

// Item operations
async function addItem(id, listId, name, quantity, category, addedBy) {
  // Get the current max sort_order for this list, so new items go to the end
  const maxResult = await client.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM items WHERE list_id = ?',
    args: [listId],
  });
  const nextOrder = Number(maxResult.rows[0]?.max_order ?? -1) + 1;
  await client.execute({
    sql: 'INSERT INTO items (id, list_id, name, quantity, category, added_by, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, listId, name, quantity || '1', category || '', addedBy || 'Anonymous', nextOrder],
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
    sql: 'SELECT * FROM items WHERE list_id = ? ORDER BY sort_order ASC',
    args: [listId],
  });
  return result.rows;
}

async function reorderItems(listId, itemIds) {
  // Update sort_order for each item based on its position in the array
  const statements = itemIds.map((itemId, index) => ({
    sql: 'UPDATE items SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND list_id = ?',
    args: [index, itemId, listId],
  }));
  await client.batch(statements, 'write');
  await updateListTimestamp(listId);
  return getItemsByListId(listId);
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
  reorderItems,
  updateItem,
  deleteItem,
};
