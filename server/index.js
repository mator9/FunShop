const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

function generateId(length = 12) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize the database
db.getDb();

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
    const list = db.createList(id, name.trim(), shareCode);
    res.status(201).json(list);
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// Get a list by ID
app.get('/api/lists/:id', async (req, res) => {
  try {
    const list = db.getListById(req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const items = db.getItemsByListId(list.id);
    res.json({ ...list, items });
  } catch (err) {
    console.error('Error fetching list:', err);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// Get a list by share code
app.get('/api/lists/share/:shareCode', async (req, res) => {
  try {
    const list = db.getListByShareCode(req.params.shareCode);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const items = db.getItemsByListId(list.id);
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
    const list = db.updateListName(req.params.id, name.trim());
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
    db.deleteList(req.params.id);
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
    const { name, quantity, category, addedBy } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    const list = db.getListById(req.params.listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const id = generateId(12);
    const item = db.addItem(id, req.params.listId, name.trim(), quantity, category, addedBy);
    io.to(req.params.listId).emit('item:added', item);
    res.status(201).json(item);
  } catch (err) {
    console.error('Error adding item:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update an item
app.patch('/api/items/:id', async (req, res) => {
  try {
    const item = db.updateItem(req.params.id, req.body);
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
    const item = db.deleteItem(req.params.id);
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

// Start server — bind to 0.0.0.0 for cloud deployment
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
