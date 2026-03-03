# Shared Shopping List

A real-time collaborative shopping list web application. Create shopping lists, share them with family and friends, and work on them together in real-time.

## Deploy to the Web (Free)

The easiest way to get this running on the web for free is with **Render.com**:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mator9/FunShop)

### Step 1: Set Up a Free Turso Database

The app uses [Turso](https://turso.tech) for persistent data storage (free tier: 9 GB storage, 500M rows read/month). This ensures your data survives Render restarts and redeployments.

1. **Sign up** at [turso.tech](https://turso.tech) (free, no credit card required)
2. Install the Turso CLI:
   ```bash
   # macOS / Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
3. Log in and create a database:
   ```bash
   turso auth login
   turso db create shopping-list
   ```
4. Get your database URL and auth token:
   ```bash
   turso db show shopping-list --url
   turso db tokens create shopping-list
   ```
   Save both values — you'll need them for the Render setup below.

### Step 2: Deploy to Render

#### One-click deploy

Use the Deploy button at the top of this section. When prompted, fill in the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables with the values from Step 1.

#### Manual Render Setup

If the button above doesn't work, you can deploy manually in a few steps:

1. **Sign up** at [render.com](https://render.com) using your GitHub account (free)
2. Click **"New"** > **"Web Service"**
3. Connect your GitHub repository (`mator9/FunShop`)
4. Configure the service:
   - **Name**: `shared-shopping-list` (or anything you like)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command**: `cd server && node index.js`
   - **Instance Type**: Free
5. Add environment variables (under **Environment**):
   - `TURSO_DATABASE_URL` — your Turso database URL (e.g. `libsql://shopping-list-yourname.turso.io`)
   - `TURSO_AUTH_TOKEN` — your Turso auth token
6. Click **"Create Web Service"**
7. Wait 2-3 minutes for it to build and deploy
8. Your app will be live at `https://your-service-name.onrender.com`

> **Note**: On the free tier, the service sleeps after 15 minutes of inactivity. The first request after sleeping takes ~30 seconds to wake up. Your data is stored in Turso's cloud database and persists across restarts, redeployments, and sleep cycles.

## Features

- **Create shopping lists** — Start a new list with a name
- **Share with others** — Share via a unique code or direct link
- **Real-time collaboration** — Changes sync instantly across all connected users via WebSockets
- **Mark items as found** — Check off items as you find them in the store
- **Progress tracking** — See how many items have been found at a glance
- **User identity** — See who added items and who found them
- **Edit in place** — Double-click items to rename them; click list title to edit

## Tech Stack

- **Frontend**: React 18, React Router, Vite
- **Backend**: Node.js, Express
- **Database**: SQLite-compatible cloud database via [Turso](https://turso.tech) (libSQL), with local SQLite fallback for development
- **Real-time**: Socket.io
- **Styling**: Custom CSS with modern design

## Running Locally

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

The app will be available at `http://localhost:3001`. When run without `TURSO_DATABASE_URL`, it automatically uses a local SQLite file (`server/shopping_lists.db`), so no external database setup is needed for local development.

### Development

Run the server and client in separate terminals:

```bash
# Terminal 1: Start the backend server
npm run dev:server

# Terminal 2: Start the Vite dev server (with hot reload)
npm run dev:client
```

The Vite dev server runs at `http://localhost:5173` and proxies API requests to the backend.

To use your Turso cloud database locally (optional):

```bash
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"
npm run dev:server
```

## Usage

1. **Create a list** — Enter a name on the home page and click "Create List"
2. **Add items** — Type an item name and click "Add". Expand for quantity options
3. **Share** — Click the "Share" button to get a share code or link
4. **Join a list** — Enter a share code on the home page, or open the share link directly
5. **Mark items found** — Click the checkbox next to an item when you find it
6. **Edit items** — Double-click an item name to edit it
7. **Delete items** — Hover over an item and click the X button
