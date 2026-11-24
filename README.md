# HireTrack — Recruitment Management System

HireTrack is a full-stack Recruitment Management System built with a **Rust + Loco.rs + PostgreSQL** backend and a **React + TypeScript + Tailwind CSS + Vite** frontend.

This repository currently contains **Phase 1: Project Setup**.

---

## Technology Stack

### Backend (`backend/`)
- **Rust** — Systems programming language for fast, safe APIs
- **Loco.rs** — Batteries-included Rust web framework built on Axum and SeaORM
- **PostgreSQL** — Relational database for recruitment data

### Frontend (`frontend/`)
- **React + TypeScript** — Component-based UI with static type checking
- **Tailwind CSS (v4)** — Utility-first CSS styling via `@tailwindcss/vite`
- **Vite** — Fast local development server and production bundler

---

## Project Structure

```text
HireTrack/
├── .gitignore
├── README.md
├── backend/                     # Loco.rs API server (preserves standard Loco layout)
│   ├── .env.example
│   ├── Cargo.toml
│   ├── config/                  # Environment YAML configs (development.yaml, test.yaml)
│   ├── migration/               # SeaORM database migrations crate
│   ├── src/
│   │   ├── app.rs               # Central Loco Hooks wiring (routes, workers, tasks, DB)
│   │   ├── lib.rs               # Backend crate module exports
│   │   ├── bin/main.rs          # CLI entry point (cargo loco ...)
│   │   ├── controllers/         # HTTP route handlers (includes /api/health)
│   │   ├── fixtures/            # Seed data fixtures
│   │   ├── initializers/        # Startup initializers
│   │   ├── mailers/             # Email templates and senders
│   │   ├── models/              # SeaORM models and generated _entities
│   │   ├── tasks/               # Custom CLI tasks
│   │   ├── views/               # Response view models
│   │   └── workers/             # Background job workers
│   └── tests/                   # Integration and HTTP request tests
└── frontend/                    # React + TypeScript + Tailwind + Vite application
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.ts           # Includes Tailwind plugin and /api proxy to port 5150
    └── src/
        ├── components/          # Reusable UI components
        ├── context/             # React Context definitions (appConfigContext)
        ├── hooks/               # Custom React hooks (useAppConfig, useBackendHealth)
        ├── layouts/             # Shared page layouts (MainLayout)
        ├── pages/               # Route/screen-level views (HomePage)
        ├── services/            # Backend API communication (apiClient)
        ├── types/               # Shared TypeScript interfaces and types
        └── utils/               # Pure helper and formatting functions
```

---

## Prerequisites

Install the following tools on your development machine:

1. **Node.js (v20+)** and **npm** — https://nodejs.org/
2. **Rust toolchain (`rustup`, `rustc`, `cargo`)** — https://rustup.rs/
3. **Loco CLI** (optional helper for generators):
   ```bash
   cargo install loco
   ```
4. **PostgreSQL (v15+)** — https://www.postgresql.org/download/

---

## Environment Configuration

Never commit `.env` files containing real passwords or secrets. Copy the example files first:

### Frontend
```bash
cd frontend
cp .env.example .env
```

### Backend
```bash
cd backend
cp .env.example .env
```

Update `DATABASE_URL` and `JWT_SECRET` inside `backend/.env` with your local PostgreSQL credentials.

---

## Running Locally

### 1. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend runs at `http://localhost:5173`. Requests to `/api/*` are proxied to `http://localhost:5150`.

> **Windows PowerShell tip:** If PowerShell blocks `npm` due to execution policy, run `npm.cmd run dev` or enable local scripts with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 2. Verify & Start the Backend
Ensure PostgreSQL is running and databases `hiretrack_development` and `hiretrack_test` exist, then run:
```bash
cd backend
cargo check
cargo run -- start
```
The backend API runs at `http://localhost:5150` and exposes `GET /api/health` for Phase 1 connectivity checks.
