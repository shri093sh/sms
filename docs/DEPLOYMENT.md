# Deployment

Two workflows, depending on what you're doing.

## A. Local development (hot reload)

Run just Postgres in Docker, and `client`/`server` directly with `npm run dev`
so you get hot reload:

```
docker compose -f docker-compose.dev.yml up -d
cd server && npm install && npm run prisma:migrate && npm run prisma:seed && npm run dev
cd client && npm install && npm run dev
```

Client: http://localhost:5173 (Vite proxies `/api` to the server on 4000).

## B. Full stack in Docker (closest to production)

```
docker compose up -d --build
```

This builds and runs all three services:
- `postgres` — Postgres 16, with a healthcheck so `server` waits for it.
- `server` — Express API. On container start, runs `prisma migrate deploy`
  (applies pending migrations, never prompts, never generates a new
  migration from schema drift) and then starts the API.
- `client` — built with Vite, served by nginx. nginx proxies `/api/*` to the
  `server` container (see `client/nginx.conf`), so the browser only ever
  talks to one origin — no CORS to worry about here, and cookies (the
  refresh-token cookie from Phase 3/4) work without cross-site cookie
  settings.

Open http://localhost:8080. Seed demo data once, from inside the server
container:

```
docker compose exec server npm run prisma:seed
```

## Environment variables

Copy `server/.env.example` for the full list with comments. The ones that
matter most for a real deployment:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Points at your managed Postgres instance. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | **Must** be changed from the dev fallback before any deployment reachable outside your own machine — generate with e.g. `openssl rand -hex 32`. |
| `CLIENT_ORIGIN` | Only matters if the client is served from a different origin than the API (i.e. you're not using the nginx-proxy setup above). Locks down CORS. |
| `BACKUP_DIR` | Where `pg_dump` output lands (Phase 9's automated backup job). Mount a persistent volume here — `docker-compose.yml` already does (`prerana_backups`). |

`docker-compose.yml` sets dev-fallback JWT secrets directly as environment
values for convenience — **replace those before deploying anywhere real**,
ideally via your host's secret manager rather than committing real values
into the compose file.

## Deploying to a managed host (Render / Railway / a VPS)

The shape is the same regardless of host:

1. **Database**: provision managed Postgres (Render/Railway both offer this
   directly; on a VPS, run the `postgres` service from `docker-compose.yml`
   or install Postgres 16 natively).
2. **Server**: deploy `server/Dockerfile` as a web service. Set the env vars
   above. The container's `CMD` already runs `prisma migrate deploy` before
   starting, so each deploy self-migrates — no separate migration step to
   remember, but do keep an eye on migration output in deploy logs the first
   time you ship a schema change.
3. **Client**: deploy `client/Dockerfile` as a static/web service. If your
   host doesn't let you point nginx at the server container by service name
   (that's a Docker Compose networking convenience), change `client/nginx.conf`'s
   `proxy_pass` target to the server's real public URL, or skip nginx proxying
   entirely and set the client to call the server's public URL directly —
   in that case also set `CLIENT_ORIGIN` on the server to the client's
   public URL so CORS allows it.
4. **Backups**: `BACKUP_DIR` needs to point at a persistent volume/disk, not
   ephemeral container storage, or backups vanish on every redeploy.
5. **Migrations on deploy**: already handled by the server container's
   startup command (`prisma migrate deploy`). If you deploy the server
   without Docker (e.g. directly with `npm start` on a VPS), run
   `npx prisma migrate deploy` manually as a deploy step before restarting
   the process.

## What's intentionally not covered here

TLS/HTTPS termination, a reverse proxy in front of both services, horizontal
scaling of the server (the overdue-sweep and backup cron jobs both assume a
single running server instance — running more than one would double-fire
them), and CI/CD pipeline setup. These are infrastructure choices specific
to wherever you actually deploy, and are out of scope for this app-level
phase plan.
