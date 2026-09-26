const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./database');

function generateId(length = 12) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

const MAX_LIST_NAME = 100;
const MAX_ITEM_NAME = 200;
const MAX_NICKNAME = 30;
const MAX_ITEMS_PER_LIST = 300;

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// Render (and most cloud hosts) sit behind a reverse proxy; trust one hop so
// express-rate-limit keys on the real client IP, not the proxy address.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '16kb' }));

const listCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many lists created. Please try again later.' },
});

const shareLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many share code lookups. Please try again later.' },
});

const itemCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many items created. Please try again later.' },
});

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ============ REST API Routes ============

// Create a new shopping list
app.post('/api/lists', listCreateLimiter, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }
    if (name.trim().length > MAX_LIST_NAME) {
      return res.status(400).json({ error: `List name must be ${MAX_LIST_NAME} characters or less` });
    }
    const id = generateId(12);
    const shareCode = generateId(16);
    const list = await db.createList(id, name.trim(), shareCode);
    res.status(201).json(list);
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// Get a list by ID
app.get('/api/lists/:id', async (req, res) => {
  try {
    const list = await db.getListById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const items = await db.getItemsByListId(list.id);
    res.json({ ...list, items });
  } catch (err) {
    console.error('Error fetching list:', err);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// Get a list by share code
app.get('/api/lists/share/:shareCode', shareLookupLimiter, async (req, res) => {
  try {
    const list = await db.getListByShareCode(req.params.shareCode);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const items = await db.getItemsByListId(list.id);
    res.json({ ...list, items });
  } catch (err) {
    console.error('Error fetching list:', err);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// Update list name
app.patch('/api/lists/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }
    if (name.trim().length > MAX_LIST_NAME) {
      return res.status(400).json({ error: `List name must be ${MAX_LIST_NAME} characters or less` });
    }
    const list = await db.updateListName(req.params.id, name.trim());
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    io.to(req.params.id).emit('list:updated', list);
    res.json(list);
  } catch (err) {
    console.error('Error updating list:', err);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// Delete a list
app.delete('/api/lists/:id', async (req, res) => {
  try {
    await db.deleteList(req.params.id);
    io.to(req.params.id).emit('list:deleted');
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting list:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// Add item to list
app.post('/api/lists/:listId/items', itemCreateLimiter, async (req, res) => {
  try {
    const { name, quantity, addedBy, unit } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (name.trim().length > MAX_ITEM_NAME) {
      return res.status(400).json({ error: `Item name must be ${MAX_ITEM_NAME} characters or less` });
    }
    if (addedBy && addedBy.length > MAX_NICKNAME) {
      return res.status(400).json({ error: `Nickname must be ${MAX_NICKNAME} characters or less` });
    }
    const list = await db.getListById(req.params.listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const itemCount = await db.getItemCountByListId(req.params.listId);
    if (itemCount >= MAX_ITEMS_PER_LIST) {
      return res.status(400).json({ error: `A list can have at most ${MAX_ITEMS_PER_LIST} items` });
    }
    const id = generateId(12);
    const item = await db.addItem(id, req.params.listId, name.trim(), quantity, addedBy, unit);
    io.to(req.params.listId).emit('item:added', item);
    res.status(201).json(item);
  } catch (err) {
    console.error('Error adding item:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Reorder items in a list
app.patch('/api/lists/:listId/items/reorder', async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array is required' });
    }
    const list = await db.getListById(req.params.listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const items = await db.reorderItems(req.params.listId, itemIds);
    io.to(req.params.listId).emit('items:reordered', items);
    res.json(items);
  } catch (err) {
    console.error('Error reordering items:', err);
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// Update an item (whitelist allowed fields)
app.patch('/api/items/:id', async (req, res) => {
  try {
    const { name, quantity, unit, is_found, found_by, looking_for_by } = req.body;
    if (name !== undefined && typeof name === 'string' && name.trim().length > MAX_ITEM_NAME) {
      return res.status(400).json({ error: `Item name must be ${MAX_ITEM_NAME} characters or less` });
    }
    if (found_by !== undefined && typeof found_by === 'string' && found_by.length > MAX_NICKNAME) {
      return res.status(400).json({ error: `Nickname must be ${MAX_NICKNAME} characters or less` });
    }
    if (looking_for_by !== undefined && typeof looking_for_by === 'string' && looking_for_by.length > MAX_NICKNAME) {
      return res.status(400).json({ error: `Nickname must be ${MAX_NICKNAME} characters or less` });
    }
    const item = await db.updateItem(req.params.id, { name, quantity, unit, is_found, found_by, looking_for_by });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    io.to(item.list_id).emit('item:updated', item);
    res.json(item);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const item = await db.deleteItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    io.to(item.list_id).emit('item:deleted', { id: item.id, list_id: item.list_id });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Catch-all: serve React app for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ============ WebSocket Events ============

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a shopping list room for real-time updates
  socket.on('join:list', (listId) => {
    socket.join(listId);
    console.log(`Socket ${socket.id} joined list ${listId}`);
  });

  // Leave a shopping list room
  socket.on('leave:list', (listId) => {
    socket.leave(listId);
    console.log(`Socket ${socket.id} left list ${listId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ============ Startup ============

async function start() {
  // Initialize the database (creates tables if they don't exist)
  await db.getDb();
  console.log('Database initialized');

  // Start server — bind to 0.0.0.0 for cloud deployment
  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
