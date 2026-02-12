# Prediction Market Hedging Tool

A platform to help businesses hedge operational risks using prediction markets (Kalshi, PolyMarket).

## Prerequisites

- Node.js (v18+)
- Python (v3.9+)

## Quick Start

1.  **Setup**: Install dependencies.
    ```bash
    make setup
    ```

2.  **Run Development Servers**: Starts Frontend (3000) and Backend (8000).
    ```bash
    make dev
    ```

## Architecture

- **Client**: Next.js + Tailwind CSS (`/client`)
- **Server**: FastAPI (`/server`)
- **Markets**: Adapters for Kalshi and PolyMarket (`/server/app/markets`)
