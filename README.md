# GalaxyEx MVP (Simulation)

Profit-first crypto simulation platform with exchange-style UX.

## Architecture

```
Browser (Next.js frontend)
      │  HTTP / JSON
      ▼
Backend Engine (Express + JWT auth)   ──▶  MongoDB
      │
      └── price feed (Binance public API)
```

- **Frontend** (`/web`): Next.js + Tailwind — UI only, no database.
- **Backend** (`/engine`): Node.js + Express — business logic, JWT auth, simulation.
- **Database**: MongoDB — users, balances, trades, yield positions, platform config.

## Important

This MVP is simulation-only:
- Internal balances only (no on-chain custody)
- No real order matching
- Manual/admin credits for deposits

## Run locally

### Option A — Docker Compose (recommended)

```bash
# Start all services (MongoDB + engine + frontend)
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Engine API | http://localhost:8080 |
| MongoDB | localhost:27017 |

To start only the backend stack without the frontend:

```bash
docker compose up -d mongodb engine
```

### Option B — Manual

**1) MongoDB**

Install and run MongoDB locally (or use [MongoDB Atlas](https://mongodb.com/atlas)):

```bash
mongod --dbpath ./data/db
```

**2) Engine**

```bash
cd engine
cp .env.example .env          # fill MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

**3) Frontend**

```bash
cd web
cp .env.example .env.local    # set NEXT_PUBLIC_ENGINE_URL
npm install
npm run dev
```

## Environment variables

### `engine/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/galaxyex` | MongoDB connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `PORT` | `8080` | HTTP listen port |
| `CORS_ORIGINS` | *(empty = allow all)* | Comma-separated allowed CORS origins |

### `web/.env.local`

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENGINE_URL` | `http://localhost:8080` | Backend engine URL |

## Auth

- `POST /api/auth/register` — create account `{ email, password }`
- `POST /api/auth/login` — returns `{ token, userId, email, role }`
- All protected endpoints require `Authorization: Bearer <token>`
- Admin endpoints require `role: "admin"` in the JWT

A demo user (`demo@galaxyex.io` / `demo1234`) is seeded automatically on startup.

## Engine endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | user | Current user |
| GET | `/api/state` | user | Own simulation state |
| GET | `/api/state/:userId` | — | State by userId (demo access) |
| POST | `/api/trade` | user | Execute trade |
| POST | `/api/earn/subscribe` | user | Join earning pool |
| POST | `/api/earn/accrue` | admin | Trigger yield accrual |
| POST | `/api/admin/config` | admin | Update platform config |
| POST | `/api/admin/adjust-balance` | admin | Adjust user balance |
| POST | `/api/bot/tick` | admin | Generate bot trades |

## Deployment

### Backend (self-hosted)

The engine can run on any Node.js 20+ server or container:

```bash
cd engine
npm ci
npm run build
node dist/index.js
```

Set the environment variables (see above), especially `MONGODB_URI` pointing to your MongoDB instance (local, Atlas, etc.) and a strong `JWT_SECRET`.

### Frontend (Vercel)

```bash
cd web
vercel deploy
```

Set `NEXT_PUBLIC_ENGINE_URL` to your backend server URL.

## Key pages

- `/login` — email + password auth
- `/dashboard` — portfolio overview
- `/trade` — place simulated trades
- `/earn` — yield pool enrollment
- `/wallet` — internal ledger
- `/admin` — platform controls (admin role required)
