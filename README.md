# GalaxyEx MVP (Simulation)

Profit-first crypto simulation platform with exchange-style UX.

## Stack
- Frontend: Next.js + Tailwind (`/web`)
- Backend: Supabase Auth + Postgres (`/supabase/schema.sql`)
- Core Engine: Node.js service (`/engine`)

## Important
This MVP is simulation-only:
- Internal balances only
- No on-chain custody
- No real order matching
- Manual/admin credits for deposits

## Run locally

### 1) Web
- `cd web`
- `npm install`
- `npm run dev`

### 2) Engine
- `cd engine`
- `npm install`
- `npm run dev`

Engine defaults to `http://localhost:8080`.

### 3) Environment
Copy and fill examples:
- `web/.env.example` -> `web/.env.local`
- `engine/.env.example` -> `engine/.env`

## Key pages
- `/login`
- `/dashboard`
- `/trade`
- `/earn`
- `/wallet`
- `/admin`

## Engine endpoints
- `GET /health`
- `GET /api/state/:userId`
- `POST /api/trade`
- `POST /api/earn/subscribe`
- `POST /api/earn/accrue`
- `POST /api/admin/config`
- `POST /api/admin/adjust-balance`
- `POST /api/bot/tick`
