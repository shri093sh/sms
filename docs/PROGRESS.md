# Progress Tracker

Update this file at the end of every phase. It's the single source of truth
for "what's built" so any future session can resume correctly.

## Status

| Phase | Title | Status |
|---|---|---|
| 1 | Project Setup & Architecture | ✅ Done |
| 2 | Database & Backend Foundation | ✅ Done |
| 3 | Authentication & RBAC | ✅ Done |
| 4 | React App Shell | ✅ Done |
| 5 | Dashboard & Stats | ✅ Done |
| 6 | Student Management | ✅ Done |
| 7 | Fees & EMI Management | ✅ Done |
| 8 | Attendance Module | ✅ Done |
| 9 | Settings, Backups & Notifications | ✅ Done |
| 10 | Polish, Testing & Deployment | ✅ Done |
| 11 | Staff, Timetable & Payroll | ⏳ Not started |
| 12 | Academics: Exams, Grades & Homework | ⏳ Not started |
| 13 | Communication & Multi-Branch | ⏳ Not started |
| 14 | Reports, Audit Log & Import/Export | ⏳ Not started |
| 15 | Auth Extras, PWA & Theme | ⏳ Not started |

## Phase 1 notes
- Scaffolded `client/` (Vite + React) and `server/` (Express) with matching
  folder structure from `PLAN.md`.
- Ported design tokens (colors, fonts, radius) from the original
  `ghghkapp_3.html` `:root` CSS variables into `client/src/styles/theme.css`.
- Server has a working `/api/health` route and env-based config — no DB yet.
- Client has a placeholder landing page confirming the app boots and can
  reach the server health endpoint.
- No auth, no database, no real pages yet — intentionally deferred to
  Phases 2–4.

## Phase 2 notes
- Added `server/prisma/schema.prisma`: `User`, `Student`, `FeePlan`,
  `Installment`, `AttendanceRecord`, `Settings`, `BackupLog` models with
  enums for role/status fields. Only core models — Phase 11-15 models
  (Staff, Timetable, Exam, Announcement, Branch, AuditLog...) are added
  when those phases are actually built.
- Added `server/prisma/seed.js` — demo admin/teacher/accountant users
  (password `demo1234`, bcrypt-hashed) + 3 sample students with a 4-part
  fee plan (2 paid, 2 pending), matching the original app's demo-login
  grid so Phase 3/4 have real data to log in against immediately.
- Added `docker-compose.yml` (root) — local Postgres 16, no manual install
  needed.
- Server: typed errors (`server/src/utils/errors.js`), central error
  handler that also maps common Prisma error codes (P2002 unique
  violation → 409, P2025 not found → 404), 404 handler, morgan request
  logging, Prisma client singleton (`server/src/config/db.js`).
- New `/api/health/db` route confirms the API can reach Postgres via
  Prisma (`SELECT 1`), separate from the plain `/api/health` liveness check.
- All new/modified JS files passed `node --check` (syntax verified).
  `prisma validate` could not run in this sandbox — outbound access to
  `binaries.prisma.sh` (Prisma's engine-binary CDN) isn't on the allowed
  domain list, so the query-engine download fails. Schema uses only
  standard Prisma syntax; run `npx prisma validate` yourself after
  `npm install` if you want to double-check before migrating.
- No auth endpoints yet (Phase 3) — routes still just health checks.

## Phase 3 notes
- Endpoints under `/api/auth`: `POST /register` (admin-only — no public
  self-registration for a school SMS), `POST /login` (rate-limited, 10
  attempts/15min/IP), `POST /refresh`, `POST /logout`, `GET /me`.
- Passwords hashed with bcryptjs (cost 10). Login returns the same
  "Invalid email or password" message whether the email doesn't exist or
  the password is wrong, so it can't be used to enumerate accounts.
- Access token: short-lived JWT (15m default) returned in the response
  body, sent by the client as `Authorization: Bearer <token>`.
- Refresh token: longer-lived JWT (7d default) set as an **httpOnly**
  cookie scoped to `/api/auth`, `sameSite: lax`, `secure` auto-enabled
  behind HTTPS. `POST /refresh` reads it, verifies it, and issues a new
  access+refresh pair (rotation).
- `requireAuth` middleware verifies the access token and populates
  `req.user` (id/role/email) without hitting the DB — cheap on every
  protected request. `requireRole(...roles)` layers on top for RBAC,
  matching the original's `MESH_EVENT_PERMISSIONS` role split: `admin`
  (everything), `accountant` (fees/EMI + reports), `teacher` (attendance +
  student view). Route-level role checks land as each resource's routes
  are built in later phases.
- **Verification performed**: all files passed `node --check`. Prisma's
  query engine still can't be generated in this sandbox
  (`binaries.prisma.sh` isn't reachable), so I couldn't boot the full
  server end-to-end against a real DB here — but I isolated and
  *runtime-tested* everything that doesn't depend on Prisma: signed/
  verified real JWTs with `signAccessToken`/`verifyAccessToken`/etc., and
  ran `requireAuth` + `requireRole` against mock requests covering valid
  token, wrong role, missing header, and invalid token — all behaved
  correctly. Recommend running `npm install && npm run prisma:generate`
  and hitting `/api/auth/login` with the seeded demo users on your
  machine to confirm the DB-backed path too.
- JWT secrets have dev fallbacks in `env.js` so `npm run dev` works
  without a `.env` file, but real secrets belong in `.env` (see
  `.env.example`) — never rely on the fallback outside local dev.

## Phase 4 notes
- `services/api.js`: access token now lives only in memory (no
  localStorage), attached via a `configureApi({ getToken, onAuthExpired })`
  hook that `AuthContext` registers on mount — avoids a circular import
  between the two modules. All requests send `credentials: "include"` so
  the httpOnly refresh cookie rides along automatically.
- 401 handling: a failed request triggers exactly one `/api/auth/refresh`
  call (concurrent 401s dedupe into the same in-flight promise), then
  retries the original request once. If refresh also fails, `AuthContext`
  clears `user` and any `ProtectedRoute` redirects to `/login`.
- `AuthContext`: on mount, always attempts a silent `/api/auth/refresh`
  first (covers page reloads — access token is gone from memory but the
  refresh cookie may still be valid), showing a loading state until that
  resolves. Exposes `{ user, loading, isAuthenticated, login, logout }`.
- `ProtectedRoute`: redirects unauthenticated users to `/login` (preserving
  the attempted path in router state so `Login` can bounce back after
  success), and supports an optional `roles={[...]}` prop for later
  role-gated pages (e.g. Settings/Reports in Phase 9+).
- `Login` page: email/password form + a 3-button demo-account row (admin /
  teacher / accountant) that logs straight in with the seeded
  `demo1234` password — ported from the original app's demo-login grid,
  dev convenience only, no visible warning needed since there's no
  production deploy yet.
- `Sidebar` + `TopBar` + `AppLayout`: real components (NavLink active
  state, time-of-day greeting, org name placeholder, logout button)
  replacing the Phase 1 placeholder `App.jsx` — this is the shell every
  later phase's pages render into via `<Outlet />`.
- `Toast` (provider + `useToast()` hook), `Modal`, and `ConfirmDialog`
  added now, unused by name until Phase 5+ but wired through `App.jsx`
  (`ToastProvider` wraps the whole router) so later phases just call
  `useToast()` / drop in `<Modal>` without further plumbing.
- Routes: `/login` (public), `/dashboard`, `/students`, `/fees`,
  `/attendance`, `/settings` (all protected, wrapped in `AppLayout`).
  `/` and unmatched paths redirect to `/dashboard` (which itself redirects
  to `/login` if unauthenticated). Dashboard/Students/Fees/Attendance/
  Settings are placeholder pages stating which phase fills them in.
- **Verification performed**: `npm install && npx vite build` succeeded
  cleanly (47 modules transformed, no errors) — confirms all JSX/imports
  are syntactically and referentially correct. Could not runtime-test
  actual login against the DB in this sandbox (Prisma engine binary still
  blocked, same as Phases 2–3) — recommend running `docker compose up -d`,
  `npm run prisma:migrate`, `npm run prisma:seed`, then `npm run dev` in
  both `server/` and `client/` and confirming the demo-account buttons log
  in and land on `/dashboard`.
- `node_modules`/`dist` removed before packaging, as in prior phases.

## Phase 5 notes
- `GET /api/stats/summary`: total active students, fees collected this
  calendar month (sum of `Installment.amount` where `status: paid` and
  `paidDate` in month), pending+overdue installment count, and today's
  attendance % (present / total marked, `null` if nobody's been marked
  yet today so the UI can show "Not marked yet" instead of a misleading
  0%). Four small parallel Prisma queries rather than one raw SQL blob.
- `GET /api/stats/activity`: last 5 payments + last 5 attendance marks,
  merged and sorted by timestamp, capped at 8 items — a fixed-size feed,
  no pagination needed for a dashboard widget.
- Both routes are `requireAuth` only (no `requireRole`) — admin, teacher,
  and accountant all land on the same dashboard.
- `useApi(path, { intervalMs })` — new shared hook in `hooks/`: loading /
  error / data, optional polling that pauses when the tab is hidden
  (`document.visibilityState`). Dashboard is the first consumer, polling
  both endpoints every 30s; later phases (fees list, attendance roster)
  can reuse it as-is.
- `StatCard` — 4-card grid (auto-fit, wraps on narrow screens), pulse
  placeholder while loading so the grid doesn't jump.
- `ConnectionStatus` — pings `/api/health` every 15s, renders a pill
  (checking/live/off) using the existing `--sync-live` / `--sync-pending`
  / `--sync-off` tokens from the original mesh-status pill. This *is* the
  "API connection" pill called for in `PLAN.md` — it replaces the old
  P2P sync-status concept 1:1 (single REST source of truth now, so
  "live/off" just means "can I reach the API").  Mounted in `TopBar`.
- `Dashboard` page now renders the stat grid + a recent-activity list
  (payment vs. attendance dot, relative date) instead of the Phase 1/4
  placeholder text.
- **Verification performed**: `node --check` on all new/modified server
  files; `npm install && npx vite build` succeeded (50 modules, no
  errors). Could not runtime-test the actual `/api/stats/*` queries
  against Postgres in this sandbox (same Prisma-binary restriction as
  every prior phase) — recommend hitting `/api/stats/summary` and
  `/api/stats/activity` with a logged-in demo user on your machine to
  confirm the numbers match the seeded data (2 paid installments should
  show up in "fees collected" only if their `paidDate` falls in the
  current month — the seed data uses fixed 2026 dates, so check that
  against today's date when testing).

## Phase 6 notes
- `GET /api/students` — pagination (`page`/`pageSize`, max 100/page),
  search (`q`, case-insensitive across name/rollNo/guardianName/
  guardianPhone), filter (`className`, `section`, `status` — defaults to
  `active`, pass `all` or `archived` to see others), sort (`sort`/`dir`,
  whitelisted to a fixed column set to avoid arbitrary-field injection).
- `POST /:id/archive` and `POST /:id/restore` replace the `DELETE` the
  plan sketched — soft-delete via `status: archived` instead of removing
  the row (keeps fee/attendance history intact, matches the plan's own
  "archive instead of hard delete" instruction). Both admin-only.
- `POST /` and `PUT /:id` are admin-only (`requireRole("admin")`); `GET`
  routes are any authenticated role — teachers need the roster for
  attendance, accountants for fees, matching the existing role map.
  Roll/class/section uniqueness re-checked server-side on both create and
  update (only re-queried on update if one of those three fields
  actually changed, to skip the extra round-trip on a plain name edit).
- Validation rules live in `server/src/utils/studentValidation.js` and are
  hand-mirrored in `client/src/utils/studentValidation.js` (noted in both
  files' headers) — no shared workspace between the two packages yet, so
  "shared rules where practical" means "same logic, kept in sync
  manually" rather than one imported module.
- `DataGrid` — generic sortable table (columns config + row actions render
  prop), state owned by the caller since sort/page are server-driven, not
  client-side re-sorts of an already-fetched page.
- `StudentForm` — add/edit modal built on the Phase 4 `Modal`, runs client
  validation on submit and merges in server `details` (e.g. duplicate
  roll number) if the request still comes back invalid.
- `Students` page: search input is debounced (350ms) separately from the
  filter/sort/page state so typing doesn't fire a request per keystroke;
  archive/restore goes through the Phase 4 `ConfirmDialog`.
- `api.js`: error responses now carry through `details` (field-level
  validation errors) and `status` on the thrown `Error`, not just
  `message` — needed for `StudentForm` to show server-side field errors
  inline instead of just a toast.
- **Verification performed**: `node --check` on all new/modified server
  files; `npm install && npx vite build` succeeded (55 modules, no
  errors). Couldn't runtime-test the actual CRUD against Postgres in this
  sandbox (same Prisma-binary restriction as every prior phase) —
  recommend testing as admin: add a student, edit it, archive it (confirm
  it drops off the default "Active" view and shows under "Archived"),
  restore it, and confirm a duplicate roll/class/section is rejected with
  a field-level error on the roll number input. Also worth confirming a
  `teacher`-role login sees the roster but not the "+ Add student" button
  or row actions.

## Phase 7 notes
- `POST /api/students/:studentId/fee-plans` auto-generates the installment
  schedule server-side: evenly split `totalAmount / installmentCount`,
  spaced one calendar month apart from `startDate` (defaults to today),
  with any rounding remainder folded into the last installment so the
  sum always exactly matches `totalAmount`. `GET` on the same path lists
  a student's plans (most recent first) with installments nested and
  sorted by due date.
- `POST /api/installments/:id/pay` — idempotent: paying an already-paid
  installment just returns it unchanged instead of erroring, since a
  double-click shouldn't surface as a failure. Accepts an optional
  `paidDate` (defaults to now) for backdating.
- `GET /api/installments?status=&className=&section=` — used by both the
  new "Overdue" tab and (via `status=overdue`) available for reuse
  wherever an overdue list is needed later (e.g. reports in Phase 14).
- `GET /api/installments/:id/receipt` — 400s on a non-paid installment
  (no receipt for money not yet collected); returns the installment with
  its fee plan and student nested, everything `ReceiptView` needs in one
  call.
- All fee/installment routes are `requireRole("admin", "accountant")` —
  teachers don't touch money in this app's role map. The `Fees` page
  itself checks the role client-side too and shows a plain "not
  available for your role" message rather than a broken/empty page.
- **Cron job** (`server/src/jobs/overdueSweep.js`, `node-cron`): runs
  hourly, flips `pending` installments past `dueDate` to `overdue` via a
  single `updateMany` (uses the existing `[status, dueDate]` index). Also
  runs once immediately at server startup, so a server that was down
  doesn't leave stale-pending installments sitting past due until the
  next hour mark. This is the direct replacement for the original app's
  `meshSweepOverdueEmi`, which only ran while some browser tab was open
  and won mesh leader-election — now it's unconditional and
  server-side, matching the "single source of truth" architecture.
- `InstallmentSchedule` — progress bar (paid amount / total) + per-row
  status badge (pending/paid/overdue) + mark-paid or receipt button
  depending on status. `FeePlanForm` — modal for creating a new plan.
  `ReceiptView` — printable receipt modal (`window.print()` + a scoped
  `@media print` rule; no PDF library needed for this).
- `Fees` page: student search (debounced, reuses `GET /api/students?q=`
  from Phase 6) selects a student and loads their plans; a separate
  "Overdue" tab lists overdue installments across all students without
  needing a student selected first.
- **Verification performed**: `node --check` on all new/modified server
  files; `node-cron` installs and `require()`s cleanly (confirmed
  separately from the Prisma-blocked `npm install`, since `postinstall`
  still fails on the same `binaries.prisma.sh` restriction as every
  prior phase — that failure is unrelated to this phase's code and
  doesn't affect `node-cron`). `npm install && npx vite build` on the
  client succeeded (58 modules, no errors). Couldn't runtime-test actual
  fee-plan creation, payment, the cron sweep, or receipt printing against
  Postgres in this sandbox — recommend on your machine: create a fee
  plan, mark one installment paid and check the receipt/print view, then
  either wait for the hourly sweep or temporarily set a seeded
  installment's `dueDate` to the past and confirm it flips to
  `overdue` (via Prisma Studio or the sweep running on `npm run dev`
  restart).

## Phase 8 notes
- `GET /api/attendance/roster?className=&section=&date=` — full active
  roster for a class/section merged with any attendance already marked
  for that date (`status: null` for unmarked students), so the marking
  grid always shows every student rather than only the ones touched so
  far.
- `POST /api/attendance` — bulk upsert, one request per "Save" click, not
  one per student. Body is `{ date, records: [{ studentId, status }] }`;
  upsert on the existing `[studentId, date]` unique constraint means
  re-saving the same day just overwrites. `admin`/`teacher` only —
  accountants don't touch attendance in the role map.
- `GET /api/attendance/summary?studentId=&month=YYYY-MM` — a student's
  records for the month plus present/absent/late counts and an
  attendance % (late counts as present for the %, consistent with the
  Phase 5 dashboard's today's-attendance-% calc). Any authenticated role
  can view (accountant/admin may want to cross-check against fees).
- `GET /api/attendance/export?className=&section=&from=&to=` — CSV
  stream, all filters optional. `admin`/`teacher` only, same as marking.
- Dates are stored as `@db.Date`; `parseDateOnly()` parses `"YYYY-MM-DD"`
  as UTC midnight explicitly rather than letting `new Date(str)` apply
  the server's local zone — keeps the stored date stable regardless of
  where Node runs.
- Added `GET /api/students/meta/classes` (distinct active
  class/section pairs) to power the Attendance page's picker without the
  client loading every student — registered before `/:id` in the router
  so Express doesn't swallow it as an `:id` param.
- `client/services/api.js`: added `api.getBlob()` (raw `Response` →
  `.blob()`) for the CSV export — a plain `<a href="/api/...">` can't
  carry the in-memory Bearer token, so the download goes through fetch
  and gets turned into an object URL client-side.
- `Attendance` page: three tabs — **Mark** (class/section/date picker,
  P/L/A buttons per student, "mark all present", single bulk save),
  **Summary** (student search + month picker, counts + %), **Export**
  (class/section + date-range filters, CSV download). Teachers and
  admins can mark; all roles can view Summary.
- **Verification performed**: `node --check` on all new/modified server
  files; `npm install && npx vite build` succeeded (58 modules, no
  errors). Couldn't runtime-test against Postgres in this sandbox (same
  Prisma-binary restriction as every prior phase) — recommend on your
  machine: mark a class's attendance for today, confirm re-opening the
  Mark tab shows the saved statuses, check a student's monthly Summary
  updates, and confirm the CSV export downloads with the right rows for
  a given class/date range. Also worth confirming a `teacher` login can
  mark but an `accountant` login can only view Summary (Mark tab's
  buttons should be disabled, Export tab isn't reachable via the API for
  that role).

## Phase 9 notes
- **Schema change**: added `User.isActive` (`Boolean @default(true)`) —
  this needs a real migration (`npx prisma migrate dev`) on your machine
  before this phase's code will run against the DB; nothing else in the
  schema changed.
- **Notifications**: email/SMS notifications were explicitly *not*
  selected in `docs/FEATURE_OPTIONS.md`, and web push is mapped to Phase
  13 (it needs the Announcements feature to be meaningful). So this phase
  is Settings + Backups only — no notification code was added here.
- **Org profile**: `Settings` is treated as a single-row table (no
  multi-branch key yet — that's Phase 13); `GET/PUT /api/settings`
  read/update it, creating the row on first access if it doesn't exist
  yet. `GET` is any authenticated role (so the org name could be shown in
  `TopBar` later without needing admin rights), `PUT` is admin-only.
- **User management**: `GET /api/users`, `PUT /api/users/:id` (role
  and/or name), `POST /api/users/:id/deactivate`,
  `POST /api/users/:id/activate` — all admin-only. Account *creation*
  reuses the existing admin-gated `POST /api/auth/register` from Phase 3
  rather than duplicating that logic; the Settings "Add user" modal calls
  it directly. No invite email (not selected) — the admin sets a
  temporary password and shares it out of band, same as `register`
  already assumed.
- Guardrails: an admin can't deactivate or demote their own account
  (`users.controller.js`), and the *last* active admin can't be
  deactivated or demoted to a non-admin role either — otherwise a school
  could lock itself out entirely.
- **Mid-session enforcement**: `auth.controller.js`'s `login` and
  `refresh` both now check `isActive`. A deactivated user's current
  access token still works until it naturally expires (≤15m default),
  but their next `/api/auth/refresh` is rejected — this mirrors the
  "disabled-admin roster permission gap" class of bug called out in the
  original app's earlier security audit, so it's handled from day one
  here rather than retrofitted later.
- **Automated backups**: `jobs/backupJob.js` replaces the original app's
  `checkDailyBackupTrigger` (which only ran while some browser tab was
  open) — `runBackup()` shells out to `pg_dump --dbname=<DATABASE_URL>`
  and writes a plain-SQL file under `env.backupDir` (`BACKUP_DIR` env
  var, defaults to `server/backups/`, gitignored). A `BackupLog` row is
  written either way (`success`/`failed`) so failed attempts are visible
  in Settings, not silently swallowed.
- Scheduling: checked once a minute (`node-cron`, `* * * * *`) rather
  than dynamically rebuilding a cron expression whenever
  `Settings.backupTime` changes in the UI — simpler, and a once-a-minute
  `Settings` read is negligible load. A `lastRunDate` guard stops it
  firing twice inside the same HH:MM window.
- `GET /api/backups` (list, admin), `POST /api/backups/run` (manual
  trigger, admin), `GET /api/backups/:id/download` (admin) — download
  streams the file via `res.download()`; the client fetches it as a blob
  (`api.getBlob()`, added in Phase 8) since a plain link can't carry the
  in-memory Bearer token.
- `Settings` page: three tabs (Organization / Users / Backups), all
  admin-only — non-admins see a one-line "admin accounts only" message
  instead of the placeholder text. Users tab shows role dropdown +
  deactivate/reactivate per row (own account excluded from both
  controls), Add User opens a modal hitting `/auth/register`. Backups tab
  lists recent attempts with status pills and a download button on
  successful ones.
- **Verification performed**: `node --check` on every server file (not
  just the new ones — re-ran the full sweep after wiring `index.js`).
  `npm install && npx vite build` succeeded (58 modules, no errors).
  Couldn't runtime-test against Postgres in this sandbox (same
  Prisma-binary restriction as every prior phase), and `pg_dump` itself
  isn't verifiable here either — recommend on your machine: run the
  `isActive` migration, confirm `pg_dump` is on `PATH` (matching your
  Postgres server's major version), then test: update org name, add a
  user and log in as them, deactivate a non-admin user and confirm they
  can't log in, try (and expect to fail) deactivating your own account or
  the last admin, trigger a manual backup and download it, and enable
  automated backups with a `backupTime` a minute or two in the future to
  confirm the scheduler picks it up.

## Phase 10 notes
- **Error boundaries**: `client/src/components/ErrorBoundary.jsx` (class
  component — React error boundaries still require a class). Mounted in two
  places: wrapping the whole `<Routes>` tree in `App.jsx` (catches errors
  from providers/router itself) and wrapping just `<Outlet />` inside
  `AppLayout` (catches a single page crashing without taking the
  sidebar/topbar down with it — user can navigate away or hit "Try again").
- **Responsive/mobile pass**: `theme.css` gained a ≤860px breakpoint where
  `Sidebar` becomes an off-canvas drawer (`.app-sidebar`/`.open`, backdrop,
  toggled via a new hamburger button in `TopBar`) and a ≤640px breakpoint
  where the Dashboard's stat grid (`.stat-grid`) collapses to one column.
  `DataGrid` (used by Students/Fees/Attendance) now scrolls horizontally
  (`.scroll-x`, `minWidth: 640` on the table) instead of squeezing columns
  unreadably on narrow screens. Pre-existing loading/empty states
  (`StatCard` pulse placeholder, `DataGrid`'s loading/empty rows, Dashboard's
  activity-feed empty message) were already in place from earlier phases —
  audited them during this pass rather than rebuilding, and confirmed they
  cover every list/stat view in the app.
- **Server tests** (Vitest, `server/src/__tests__/`, 21 tests, all passing):
  JWT sign/verify round-trip + tamper/cross-secret rejection
  (`jwt.test.js`); `requireAuth`/`requireRole` middleware against mock
  req/res covering valid token, missing header, invalid token, matching
  role, wrong role, and missing `req.user` (`auth.middleware.test.js`);
  `validateStudentInput` create + partial/update modes
  (`studentValidation.test.js`); and the overdue-sweep cron job
  (`overdueSweep.test.js`) — `../config/db.js` and `node-cron` are both
  `vi.mock`'d so this runs without a real Postgres connection or an actual
  ticking scheduler, and covers the hourly schedule registration, the
  immediate startup sweep, the scheduled callback firing the same query,
  and that a rejected DB call doesn't throw uncaught.
- **Client tests** (Vitest + Testing Library + jsdom,
  `client/src/__tests__/`, 9 tests, all passing): a mirror of the server's
  `studentValidation` test cases against the client's hand-synced copy of
  the same rules (catches drift between the two files if one is edited
  without the other); `ErrorBoundary` renders children normally and falls
  back to its recoverable message when a child throws; `StatCard` shows the
  loading placeholder vs. the real value vs. the optional hint correctly.
  `src/test/setup.js` wires up `@testing-library/jest-dom` matchers and
  calls `cleanup()` after every test — without it, `StatCard`'s loading and
  non-loading test cases both left DOM behind and broke `getByText`
  uniqueness in the next test.
- **Dockerfiles**: `server/Dockerfile` — `node:20-alpine`, installs
  `postgresql16-client` so the Phase 9 `pg_dump` backup job actually has
  `pg_dump` on `PATH` inside the container (must match whatever Postgres
  major version you point it at), `npm ci --omit=dev`, and its `CMD` runs
  `prisma migrate deploy` (the non-interactive, no-drift-generation form of
  migrate, unlike `migrate dev`) before starting the API — so every
  container start self-migrates. `client/Dockerfile` — multi-stage: builds
  with `vite build` in a `node:20-alpine` stage, then serves the static
  `dist/` via `nginx:1.27-alpine` using a custom `nginx.conf` that (a) falls
  back to `index.html` for any non-file path so React Router routes survive
  a hard refresh, and (b) proxies `/api/*` to the `server` container by
  Compose service name — this makes client and server same-origin from the
  browser's point of view, so no CORS configuration is needed for the
  Docker-stack deployment and the httpOnly refresh cookie just works.
- **docker-compose split in two**: `docker-compose.yml` (Postgres +
  `server` + `client`, the closest thing to a production stack, `server`
  waits on Postgres's healthcheck before starting) vs. new
  `docker-compose.dev.yml` (Postgres only, for the `npm run dev` hot-reload
  workflow every earlier phase's README used) — kept separate rather than
  overloading one file, since the dev workflow deliberately doesn't run
  server/client in Docker (hot reload needs them running directly).
- **`docs/DEPLOYMENT.md`** (new): the two local workflows above, an env-var
  table flagging which values must change before any real deployment
  (`JWT_SECRET`/`JWT_REFRESH_SECRET` above all), a host-agnostic
  Render/Railway/VPS checklist, and an explicit callout that the
  overdue-sweep and backup cron jobs both assume exactly one running server
  instance — horizontal scaling of the server isn't supported as-is without
  moving those to a dedicated worker/leader-election, which is out of scope
  for this phase.
- **Verification performed**: `cd server && npx vitest run` → 21/21 passing.
  `cd client && npx vitest run` → 9/9 passing. `cd client && npx vite build`
  → succeeds (59 modules, no errors), confirming the responsive/error-
  boundary changes didn't break the build. Dockerfiles/compose could not be
  runtime-tested in this sandbox (`docker` isn't available here, and the
  base images/`postgresql16-client` package would need network access this
  sandbox's allowlist doesn't cover for image pulls) — recommend on your
  machine: `docker compose up -d --build`, then confirm all three
  containers report healthy/running, the client is reachable on
  `:8080`, login works end-to-end through the nginx proxy (confirms the
  same-origin cookie setup), and `docker compose exec server npm run
  prisma:seed` populates demo data.

## Phase 14 — Reports, Audit Log & Data Import/Export ✅ done
- **Schema**: `AuditLog` (userId, action, entityType, entityId, before, after
  as JSON, createdAt) — already present from a prior session; `utils/audit.js`
  provides `writeAuditLog()`, a fire-and-forget best-effort logger called
  from student/staff create/update/archive/restore/import, and now also
  from installment `pay`.
- **Server — Installments export**: `GET /api/installments/export?status=&
  className=&section=` added, mirroring the students/staff CSV export
  pattern (same query-param filtering as `list`, flattened student/class
  columns). Registered before `/:id` routes. `pay()` now writes an audit
  log entry (`entityType: "Installment"`).
- **Server**: Reports (`/api/reports/*`) and Audit Log (`GET /api/audit-log`,
  admin-only, filterable by `entityType`/`userId`/`from`/`to`, paginated)
  endpoints and CSV import/export on Students were already wired from
  earlier in this phase.
- **Client — api.js**: added `postForm()` for multipart uploads (CSV
  import), and the request wrapper now skips forcing a JSON
  `Content-Type` when the body is `FormData` so the browser can set its
  own multipart boundary.
- **Client — Students.jsx**: Export CSV and Import CSV (admin-only)
  buttons added to the page header; import shows a dismissible per-row
  error panel below the filter row.
- **Client — Fees.jsx**: Export CSV button added next to the tab
  switcher, respecting the current tab's status filter (overdue vs all).
- **Client — Settings.jsx**: new "Audit log" tab (admin-only) —
  `AuditLogTab` component with entity-type and date-range filters, a
  paginated activity list (timestamp, user, action, entity), and
  previous/next paging.
- **Verification performed**: `cd server && npx vitest run` → 42/42
  passing. `cd client && npx vitest run` → 17/17 passing. `cd client &&
  npx vite build` → succeeds (867 modules, no errors). Prisma
  `generate`/`migrate` still can't run in this sandbox (binary download
  blocked by the network allowlist, same as every prior phase) — run
  `npx prisma generate && npx prisma migrate dev` in `server/` on your
  machine before starting the server.

## Decisions carried forward
- DB: PostgreSQL.
- Auth: JWT (access + refresh token pair), bcrypt for password hashing.
- Roles: `admin`, `teacher`, `accountant` (adapt from original's
  `MESH_EVENT_PERMISSIONS`, refine once original role list is fully mapped).

## How to resume in a new chat
Phases 1–14 are done. Upload the latest `prerana-sms.zip`, then say
"go to next phase" (starts Phase 15) or name a specific phase. Point to
this file and `PLAN.md` for context.

## Phase 13 — Communication & Multi-Branch ✅ done
- **Schema**: `Branch` (name, address) and `Announcement` (title, body,
  `audience: String[]` defaulting to `["all"]` — a small fixed role-name
  set kept as a Postgres array rather than a join table, since it's always
  read client-side as "does my role appear here", `createdBy` → `User`,
  optional `expiresAt`). `branchId` (nullable, `onDelete: SetNull`) added
  to `User`, `Student`, `Staff`.
- **Server — branch scoping**: `req.branchId` is resolved once in
  `requireAuth` — non-admins are pinned to their own `branchId`; admins may
  override via an `X-Branch-Id` header (the TopBar branch switcher sends
  this). `branchScope(req)` (new `utils/branchScope.js`) turns that into a
  Prisma `where` fragment, applied to the Students and Staff `list`/
  `classes` queries; both controllers also stamp `branchId` on create.
  `branchId` was added to the JWT access-token payload (`utils/jwt.js`) so
  it survives without a DB hit on every request.
- **Server — Branches**: `CRUD /api/branches` — list/get open to any
  authenticated role (populates the switcher), create/update/delete
  admin-only. Deleting a branch un-assigns its members rather than
  cascading, matching the `SetNull` FK.
- **Server — Announcements**: `GET /api/announcements` returns items
  addressed to `"all"` or the requester's role, excluding expired ones
  (admins can pass `?includeExpired=1`); `POST`/`DELETE` are admin-only.
  Audience values are validated against the fixed role set.
- **Client**: `BranchContext` (new) — admin-only, fetches `/api/branches`,
  persists the selected branch in `localStorage` (non-sensitive, unlike
  the in-memory access token), and registers a header-getter with `api.js`
  so every request carries `X-Branch-Id` while a branch is selected.
  `TopBar` gained a branch-switcher dropdown, visible only to admins with
  more than one branch. `AnnouncementsPanel` (new) sits at the top of the
  Dashboard — a banner list for everyone, plus an inline composer
  (title/body/audience checkboxes) and per-item delete for admins.
- **Deferred**: web push notifications, originally scoped for this phase,
  were dropped given the effort already spent on branch scoping — revisit
  as its own phase if still wanted.
- **Verification performed**: `cd server && npx vitest run` → 34/34
  passing (added `branchScope.test.js`; updated `auth.middleware.test.js`
  for the new `branchId`/`X-Branch-Id` behavior). `cd client && npx
  vitest run` → 17/17 passing. `cd client && npx vite build` → succeeds
  (68 modules, no errors). Prisma `generate`/`migrate` couldn't run in
  this sandbox (binary download blocked by the network allowlist, same as
  every prior phase) — run `npx prisma generate && npx prisma migrate dev`
  in `server/` on your machine before starting the server.

## Phase 12 — Academics: Exams, Grades & Homework ✅ done
- **Schema**: `Exam` (name, className, date), `Grade` (examId, studentId,
  subject, marks, maxMarks — unique per exam/student/subject), `Assignment`
  (className, subject, title, dueDate, nullable staffId), `Submission`
  (assignmentId, studentId, status: pending/submitted/late — unique per
  assignment/student), plus relations added to `Student` and `Staff`.
- **Server**: `CRUD /api/exams` (view: any role, mutate: admin/teacher,
  delete: admin), `POST /api/exams/:id/grades` bulk upsert (transaction),
  `GET /api/students/:studentId/report-card` (grades grouped by exam);
  `CRUD /api/assignments` (same role split), `POST
  /api/assignments/:id/submissions` to mark a student's status. Creating an
  assignment seeds a `pending` Submission row per active student in that
  class so the tracker has a full roster immediately.
- **Client**: `Exams.jsx` — exam list, inline bulk mark-entry grid
  (subject + max marks, one row per student in the exam's class), a
  read-only grades table once subjects have been entered, and a student
  report-card lookup (search by name/roll, view grades grouped by exam).
  `Assignments.jsx` — assignment board, click a row to open its submission
  tracker with per-student status buttons. Both pages added to `Sidebar`
  and `App.jsx`, visible to all authenticated roles (mutation UI still
  gated client-side by role, matching server-side enforcement).
- **Verification performed**: `cd server && npx vitest run` → 29/29
  passing. `cd client && npx vitest run` → 17/17 passing. `cd client &&
  npx vite build` → succeeds (66 modules, no errors). Prisma's
  `generate`/`validate` couldn't run in this sandbox (binary download
  blocked by the network allowlist) — run `npx prisma generate` and `npx
  prisma migrate dev` on your machine before starting the server, same as
  Phase 11.

## Optional feature selection — confirmed
Selected: in-app announcements, Google/SSO login, timetable/class
scheduling, exams & grades, homework/assignment tracker, staff/teacher
management, basic payroll, advanced reports & analytics, CSV/Excel
import/export, audit log, multi-branch support, PWA, dark/light theme,
web push notifications. Not selected: email/SMS notifications, payment
gateway, PDF receipts, parent/student portals, 2FA, library, document
storage, i18n. Mapped to Phases 11–15 in `PLAN.md`.
