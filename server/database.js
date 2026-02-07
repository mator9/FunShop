const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'shopping_lists.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb();
  }
  return db;
}

function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      share_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
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
    );

    CREATE INDEX IF NOT EXISTS idx_items_list_id ON items(list_id);
    CREATE INDEX IF NOT EXISTS idx_lists_share_code ON lists(share_code);
  `);
}

// List operations
function createList(id, name, shareCode) {
  const stmt = db.prepare('INSERT INTO lists (id, name, share_code) VALUES (?, ?, ?)');
  stmt.run(id, name, shareCode);
  return getListById(id);
}

function getListById(id) {
  const stmt = db.prepare('SELECT * FROM lists WHERE id = ?');
  return stmt.get(id);
}

function getListByShareCode(shareCode) {
  const stmt = db.prepare('SELECT * FROM lists WHERE share_code = ?');
  return stmt.get(shareCode);
}

function updateListName(id, name) {
  const stmt = db.prepare('UPDATE lists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(name, id);
  return getListById(id);
}

function deleteList(id) {
  const stmt = db.prepare('DELETE FROM lists WHERE id = ?');
  return stmt.run(id);
}

// Item operations
function addItem(id, listId, name, quantity, category, addedBy) {
  const stmt = db.prepare(
    'INSERT INTO items (id, list_id, name, quantity, category, added_by) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, listId, name, quantity || '1', category || '', addedBy || 'Anonymous');
  updateListTimestamp(listId);
  return getItemById(id);
}

function getItemById(id) {
  const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
  return stmt.get(id);
}

function getItemsByListId(listId) {
  const stmt = db.prepare('SELECT * FROM items WHERE list_id = ? ORDER BY is_found ASC, created_at ASC');
  return stmt.all(listId);
}

function updateItem(id, updates) {
  const item = getItemById(id);
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

  const stmt = db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  updateListTimestamp(item.list_id);
  return getItemById(id);
}

function deleteItem(id) {
  const item = getItemById(id);
  if (!item) return null;
  const stmt = db.prepare('DELETE FROM items WHERE id = ?');
  stmt.run(id);
  updateListTimestamp(item.list_id);
  return item;
}

function updateListTimestamp(listId) {
  const stmt = db.prepare('UPDATE lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(listId);
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
