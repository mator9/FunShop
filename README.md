# Shared Shopping List

A real-time collaborative shopping list web application. Create shopping lists, share them with family and friends, and work on them together in real-time.

## Features

- **Create shopping lists** - Start a new list with a name
- **Share with others** - Share via a unique code or direct link
- **Real-time collaboration** - Changes sync instantly across all connected users via WebSockets
- **Mark items as found** - Check off items as you find them in the store
- **Item categories** - Organize items by category (Produce, Dairy, Meat, etc.)
- **Progress tracking** - See how many items have been found at a glance
- **User identity** - See who added items and who found them
- **Edit in place** - Double-click items to rename them; click list title to edit

## Tech Stack

- **Frontend**: React 18, React Router, Vite
- **Backend**: Node.js, Express
- **Database**: SQLite (via better-sqlite3)
- **Real-time**: Socket.io
- **Styling**: Custom CSS with modern design

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
# Install all dependencies
npm run install:all

# Build the frontend
npm run build
```

### Running

```bash
# Start the production server (serves both API and frontend)
npm start
```

The app will be available at `http://localhost:3001`.

### Development

Run the server and client in separate terminals:

```bash
# Terminal 1: Start the backend server
npm run dev:server

# Terminal 2: Start the Vite dev server (with hot reload)
npm run dev:client
```

The Vite dev server runs at `http://localhost:5173` and proxies API requests to the backend.

## Usage

1. **Create a list** - Enter a name on the home page and click "Create List"
2. **Add items** - Type an item name and click "Add". Expand for quantity and category options
3. **Share** - Click the "Share" button to get a share code or link
4. **Join a list** - Enter a share code on the home page, or open the share link directly
5. **Mark items found** - Click the checkbox next to an item when you find it
6. **Edit items** - Double-click an item name to edit it
7. **Delete items** - Hover over an item and click the X button
