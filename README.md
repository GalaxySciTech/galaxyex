# GalaxyEx MVP (Simulation)

Profit-first crypto simulation platform with exchange-style UX.

## 快速启动指南

### 前置要求

- [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose（推荐方式）
- 或者：Node.js 20+、npm、MongoDB 7+（手动方式）

### 方式一：Docker Compose 一键启动（推荐）

```bash
# 克隆仓库
git clone <repo-url> && cd galaxyex

# 启动所有服务（MongoDB + 后端 + 前端）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

启动完成后访问：

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:3000 |
| 后端 API | http://localhost:8080 |
| MongoDB | localhost:27017 |

如果只需要启动后端（不需要前端）：

```bash
docker compose up -d mongodb engine
```

停止所有服务：

```bash
docker compose down
```

### 方式二：手动启动

**1) 启动 MongoDB**

安装并运行本地 MongoDB，或使用 [MongoDB Atlas](https://mongodb.com/atlas) 云服务：

```bash
mongod --dbpath ./data/db
```

**2) 启动后端引擎**

```bash
cd engine
cp .env.example .env          # 编辑 .env，填入 MONGODB_URI 和 JWT_SECRET
npm install
npm run dev                   # 开发模式，支持热重载
```

**3) 启动前端**

```bash
cd web
cp .env.example .env.local    # 编辑 .env.local，设置 NEXT_PUBLIC_ENGINE_URL
npm install
npm run dev                   # 开发模式，默认端口 3000
```

### 生产环境构建

```bash
# 后端
cd engine
npm ci
npm run build
node dist/index.js

# 前端
cd web
npm ci
npm run build
npm start
```

### 默认账号

系统启动后会自动创建演示账号：

- 邮箱：`demo@galaxyex.io`
- 密码：`demo1234`

### 主要页面

| 路径 | 功能 |
|------|------|
| `/login` | 登录 / 注册 |
| `/dashboard` | 资产总览 |
| `/trade` | 模拟交易 |
| `/earn` | 理财收益 |
| `/wallet` | 资金明细 |
| `/admin` | 管理后台（需要 admin 权限） |

---

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
