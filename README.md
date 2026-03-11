# Options Wheel Tracker

A clean, modular web application to track "Wheel Strategy" option trades (Cash Secured Puts & Covered Calls). Built with React, Vite, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: High-level metrics showing Total Premium Collected, Net P&L (realized), Win Rate, and Active Trades.
- **Trade Management**: Add, Edit, and Delete trades.
- **Persistence**: Data is saved locally in your browser (LocalStorage), so your data remains private and persists across reloads.
- **Responsive Design**: Works on desktop and mobile.
- **Dark Mode Support**: Respects system preference (built with Tailwind dark mode classes).

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js (v18+)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

You need to run **two processes** — the backend API server and the frontend dev server.

### Option 2: Using Docker

1. Ensure you have Docker and Docker Compose installed.
2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```
3. The app will be available at:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3001](http://localhost:3001)

The database is persisted in `./server/wheel_tracker.db`.

### Option 3: Home Assistant Add-on (GitHub - Recommended)

This is the easiest way to run and update the app on a Raspberry Pi:

1.  **Create a private/public GitHub repo** and push this entire project to it.
2.  In Home Assistant, go to **Settings > Add-ons > Add-on Store**.
3.  Click the **three dots** (top right) > **Repositories**.
4.  Add your GitHub URL and click **Add**.
5.  Close the popup, search for **"Options Wheel Tracker"**, and click **Install**.
6.  Go to the **Configuration** tab to set your `massive_api_key`.
7.  **Start** the add-on!

*Tip: Updates are handled automatically via GitHub. When you push new code to your repo, Home Assistant will show an "Update" button.*

**1. Start the backend server** (Terminal 1):

```bash
npm run server
```

This installs server dependencies and starts the Express/SQLite API.

**2. Start the frontend dev server** (Terminal 2):

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`.

| Terminal | Command         | Description                          |
| -------- | --------------- | ------------------------------------ |
| 1        | `npm run server` | Starts the Express backend (SQLite) |
| 2        | `npm run dev`    | Starts the Vite frontend dev server |

### Building for Production

```bash
npm run build
```

## Directory Structure

- `src/features`: Contains core domain logic and UI (Dashboard, Trades).
- `src/components/ui`: Reusable design system components (Button, Card, Modal, etc.).
- `src/hooks`: Custom hooks (store, persistence).
- `src/layouts`: App shells.
