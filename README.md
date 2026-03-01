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

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Directory Structure

- `src/features`: Contains core domain logic and UI (Dashboard, Trades).
- `src/components/ui`: Reusable design system components (Button, Card, Modal, etc.).
- `src/hooks`: Custom hooks (store, persistence).
- `src/layouts`: App shells.
