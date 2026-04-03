const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');
const { parseChatToItems } = require('./chat-parser');

function generateId(length = 12) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '16kb' }));

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
app.post('/api/lists', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }
    const id = generateId(12);
    const shareCode = generateId(8);
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
app.get('/api/lists/share/:shareCode', async (req, res) => {
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
app.post('/api/lists/:listId/items', async (req, res) => {
  try {
    const { name, quantity, category, addedBy, unit } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    const list = await db.getListById(req.params.listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const id = generateId(12);
    const item = await db.addItem(id, req.params.listId, name.trim(), quantity, category, addedBy, unit);
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
    const { name, quantity, unit, category, is_found, found_by, looking_for_by } = req.body;
    const item = await db.updateItem(req.params.id, { name, quantity, unit, category, is_found, found_by, looking_for_by });
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

// Parse chat text into structured shopping items (preview only, no persistence)
app.post('/api/parse-chat', async (req, res) => {
  try {
    const { text, provider } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const result = await parseChatToItems(text, { provider });
    res.json(result);
  } catch (err) {
    console.error('Error parsing chat:', err);
    res.status(500).json({ error: err.message || 'Failed to parse chat text' });
  }
});

// Batch-add items to a list in one request
app.post('/api/lists/:listId/items/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const list = await db.getListById(req.params.listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const created = [];
    for (const entry of items) {
      if (!entry.name || !entry.name.trim()) continue;
      const id = generateId(12);
      const item = await db.addItem(
        id,
        req.params.listId,
        entry.name.trim(),
        entry.quantity,
        entry.category,
        entry.addedBy
      );
      created.push(item);
    }

    io.to(req.params.listId).emit('items:batch-added', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error batch adding items:', err);
    res.status(500).json({ error: 'Failed to add items' });
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
