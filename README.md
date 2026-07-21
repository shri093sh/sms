# Prerana SMS — React + Node.js Rewrite

Client-server rewrite of the original single-file `ghghkapp_3.html` app.
See **`PLAN.md`** for the full 15-phase plan and **`docs/PROGRESS.md`** for
what's built so far. **`docs/DEPLOYMENT.md`** covers running the full stack
in Docker and deploying it somewhere real.

## Current state (Phases 1–10 done)

Core app is complete and deployable: auth (JWT + RBAC), dashboard/stats,
student management, fees/EMI with an hourly overdue-sweep cron job,
attendance (mark/summary/CSV export), settings/user management, and
automated Postgres backups (`pg_dump` cron job) — all replacing the
original single-file app's PeerJS mesh-sync architecture with a plain
REST API over one Postgres database. Plus: error boundaries, a
responsive/mobile layout pass, and unit tests on both client and server.

Phases 11–15 (staff/payroll, exams/grades, announcements/multi-branch,
reports/audit-log/import-export, PWA/SSO/theme) are optional extensions —
not started yet, see `PLAN.md`.

## Run it locally (hot reload, for active development)

**1. Start Postgres only**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**2. Server**
```bash
cd server
cp .env.example .env
npm install                # also runs `prisma generate` via postinstall
npm run prisma:migrate     # creates tables (prompts for a migration name, e.g. "init")
npm run prisma:seed        # loads demo users + sample students
npm run dev
```
Runs on http://localhost:4000.

**3. Client** (separate terminal)
```bash
cd client
npm install
npm run dev
```
Runs on http://localhost:5173. Demo logins: `admin@prerana.demo` /
`teacher@prerana.demo` / `accountant@prerana.demo`, password `demo1234`
(also available as one-click buttons on the login page).

## Run the full stack in Docker

```bash
docker compose up -d --build
docker compose exec server npm run prisma:seed   # first time only
```
Open http://localhost:8080. See `docs/DEPLOYMENT.md` for details and for
deploying beyond your own machine.

## Tests

```bash
cd server && npm test
cd client && npm test
```

## Next

Core phases (1–10) are done. Say **"go to next phase"** (or name one, e.g.
"Phase 11") to start on the optional extensions.
