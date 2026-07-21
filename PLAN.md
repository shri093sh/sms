# Prerana SMS — React + Node.js Rewrite Plan

Source: single-file app `ghghkapp_3.html` (login, sidebar/dashboard, fees/EMI,
attendance, sync settings, PeerJS mesh sync, IndexedDB, backups).
Target: standard **client-server** architecture — React (Vite) frontend,
Node.js (Express) + PostgreSQL backend, JWT auth, server-side RBAC, cron-based
background jobs. No more client-side mesh/HLC/event-sourcing.

## How this works across phases
- Each phase ends with a **zip of the whole project** (`prerana-sms.zip`).
- Download it, and when ready say **"go to next phase"**.
- Each phase's code is added on top of the previous phase — nothing is
  thrown away, so the zip always contains a runnable, growing app.
- `docs/PROGRESS.md` tracks what's done, what's next, and decisions made,
  so any phase can resume cleanly even in a new conversation.

## Architecture snapshot

```
prerana-sms/
├── PLAN.md
├── docs/PROGRESS.md
├── client/                          # React (Vite)
│   └── src/
│       ├── components/              # Sidebar, TopBar, StatCard, DataGrid, Modal, Toast...
│       ├── pages/                   # Login, Dashboard, Students, Fees, Attendance, Settings
│       ├── context/                 # AuthContext, ThemeContext
│       ├── hooks/                   # useAuth, useApi, usePagination
│       ├── services/                # api.js (fetch wrapper), auth.service.js, students.service.js...
│       └── styles/                  # theme.css (design tokens ported from original)
└── server/                          # Node.js + Express
    └── src/
        ├── config/                  # db.js, env.js
        ├── models/                  # Prisma schema: User, Student, Fee, Installment, Attendance
        ├── controllers/             # business logic per resource
        ├── routes/                  # REST endpoints
        ├── middleware/              # auth (JWT), RBAC, error handler, validation
        ├── jobs/                    # cron: EMI overdue sweep, daily backup
        └── utils/                   # password hashing, validators, pagination helpers
```

## Phase-by-phase plan (detailed)

### Phase 1 — Project Setup & Architecture ✅ done
- `client`: Vite + React scaffold, design tokens ported from original CSS
  variables into `theme.css`.
- `server`: Express skeleton, `/api/health`, env config via dotenv.
- Root tooling: `.gitignore`, README, PROGRESS tracker.

### Phase 2 — Database & Backend Foundation
- **ORM**: Prisma + PostgreSQL.
- **Schema** (initial):
  - `User` — id, name, email, passwordHash, role (admin/teacher/accountant), createdAt
  - `Student` — id, name, rollNo, className, section, guardianName, guardianPhone, admissionDate, status (active/archived)
  - `FeePlan` — id, studentId, totalAmount, installmentCount, startDate
  - `Installment` — id, feePlanId, amount, dueDate, paidDate, status (pending/paid/overdue)
  - `AttendanceRecord` — id, studentId, date, status (present/absent/late), markedBy
  - `Settings` — id, orgName, orgLogo, backupEnabled, backupTime
  - `BackupLog` — id, createdAt, fileUrl, status
- **Migrations** + seed script (demo admin/teacher/accountant + sample students, matching the original's demo-login grid).
- Central error handler with typed errors (`NotFoundError`, `ValidationError`, `AuthError`).
- Request logging (morgan), CORS locked to client origin.
- `docker-compose.yml` for local Postgres (optional, so no local Postgres install needed).

### Phase 3 — Authentication & RBAC
- Endpoints: `POST /api/auth/register`, `POST /api/auth/login`,
  `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.
- bcrypt password hashing (replaces client-side WebCrypto PBKDF2).
- JWT access token (short-lived) + refresh token (httpOnly cookie).
- `requireAuth` + `requireRole(...roles)` middleware, applied per-route.
- Login rate-limiting (express-rate-limit) to block brute force.
- Role map ported from original `MESH_EVENT_PERMISSIONS`: `admin` (full access), `accountant` (fees/EMI + reports), `teacher` (attendance + student view only).

### Phase 4 — React App Shell
- `react-router` routes: `/login`, `/dashboard`, `/students`, `/fees`, `/attendance`, `/settings`.
- `AuthContext` (login/logout/current user), `ProtectedRoute` wrapper, auto-redirect on 401.
- `Login` page — email/password form + demo-account grid (ported from original) for quick access in dev.
- `Sidebar` (nav items, active state) + `TopBar` (greeting, logout, org name) — real components replacing manual `render()`/`innerHTML`.
- Global `Toast`/`Modal`/`ConfirmDialog` components used across later phases.

### Phase 5 — Dashboard & Stats
- `GET /api/stats/summary` — total students, fees collected this month, pending installments, today's attendance %.
- `StatCard` grid on the dashboard (styled like the original stat-grid).
- Simple activity feed (recent payments, recent attendance) — optional first use of a shared `useApi` polling hook.
- "API connection" status pill replaces the old mesh sync-status pill (no P2P status needed with a single source of truth).

### Phase 6 — Student Management
- `GET/POST/PUT/DELETE /api/students`, with pagination, search (`?q=`), filter by class/section, sort.
- `DataGrid` component (sortable columns, row actions) + `StudentForm` modal (add/edit) + archive (soft-delete) instead of hard delete.
- Client-side form validation + matching server-side validation (shared rules where practical).

### Phase 7 — Fees & EMI Management
- `GET/POST /api/students/:id/fee-plans`, `POST /api/installments/:id/pay`, `GET /api/installments?status=overdue`.
- Installment schedule UI (progress bar, due dates, mark-as-paid).
- **Cron job** (`node-cron`) replacing `meshSweepOverdueEmi` — runs server-side on a fixed interval regardless of any open browser tab, flips `pending` → `overdue` past due date.
- Fee receipts (simple printable/exportable view).

### Phase 8 — Attendance Module
- `POST /api/attendance` (bulk mark for a class/date), `GET /api/attendance?studentId=&month=`.
- Daily marking grid (present/absent/late, keyboard-friendly), monthly summary view, per-student % calculation.
- CSV export of a date range.

### Phase 9 — Settings, Backups & Notifications
- Admin settings page: org profile, user management (invite/deactivate), role assignment.
- **Automated backups** as a server cron job (replaces `checkDailyBackupTrigger`, which today needs a browser tab open) — dumps DB snapshot to disk/S3 on schedule, listed + downloadable from Settings.
- Optional notification hooks (email via nodemailer, or SMS/WhatsApp via a provider API) for overdue fees / low attendance — see feature list below, pick what you want built.

### Phase 10 — Polish, Testing & Deployment
- Error boundaries, loading/empty/skeleton states, responsive/mobile pass.
- Unit tests (Vitest for client, Jest/Vitest for server) — priority: EMI sweep job, auth/RBAC, validation.
- Dockerfiles for client + server, `docker-compose.yml` for full local stack (client, server, Postgres).
- Deployment notes (e.g. Render/Railway/VPS + managed Postgres, env var checklist, migration-on-deploy step).
- Final zip = complete, deployable app.

## Key architectural decisions
| Concern | Original | New |
|---|---|---|
| Data sync | PeerJS mesh + REST shadow sync, HLC conflict resolution | Single Postgres DB via REST API — no conflict resolution needed |
| Auth | Client-side PBKDF2 + local credential store | Server-side bcrypt + JWT (access + refresh) |
| RBAC | Enforced in client JS | Enforced in Express middleware, per-route |
| Background jobs | Requires an open browser tab | Node.js cron jobs (`node-cron`), run server-side 24/7 |
| UI rendering | Manual `innerHTML` + custom `render()` | React components + hooks |
| Styling | Inline `<style>` block, CSS variables | Same design tokens, organized as `theme.css` |

## Optional feature add-ons
See `docs/FEATURE_OPTIONS.md` for a selectable list of extra features beyond
the core 10 phases (parent portal, payment gateway, notifications, reports,
multi-branch support, etc.) — pick what you want and I'll slot it into the
right phase (or add it as Phase 11+).

---

## Selected feature phases (Phases 11–15)

Based on your selection, these extend the original 10-phase core plan. All
original `ghghkapp_3.html` features (login, dashboard, fees/EMI, attendance,
sync/settings replaced by real sync, backups) stay covered by Phases 1–10
above — nothing from the source app is dropped.

### Phase 11 — Staff, Timetable & Payroll
- **Schema additions**: `Staff` (id, name, role/subject, phone, email, joinDate, status), `TimetableSlot` (id, className, section, dayOfWeek, period, subject, staffId), `PayrollRecord` (id, staffId, month, baseSalary, deductions, netPay, paidOn).
- **Endpoints**: `CRUD /api/staff`, `CRUD /api/timetable`, `GET/POST /api/payroll`.
- **UI**: Staff directory + profile page; weekly timetable grid (per class/section, drag-free simple grid); Payroll list with monthly generate + mark-paid.
- RBAC: payroll visible to `admin` only; timetable editable by `admin`, viewable by `teacher`.

### Phase 12 — Academics: Exams, Grades & Homework
- **Schema additions**: `Exam` (id, name, className, date), `Grade` (id, examId, studentId, subject, marks, maxMarks), `Assignment` (id, className, subject, title, dueDate, staffId), `Submission` (id, assignmentId, studentId, submittedAt, status).
- **Endpoints**: `CRUD /api/exams`, `POST /api/exams/:id/grades` (bulk entry), `GET /api/students/:id/report-card`, `CRUD /api/assignments`, `POST /api/assignments/:id/submissions`.
- **UI**: Exam list + bulk mark-entry grid (spreadsheet-like), auto-generated report card view (printable), assignment board with submission status per student.

### Phase 13 — Communication & Multi-Branch
- **Schema additions**: `Announcement` (id, title, body, audience role(s), createdBy, createdAt, expiresAt), `Branch` (id, name, address), add `branchId` FK to `User`/`Student`/`Staff` for data isolation.
- **Endpoints**: `CRUD /api/announcements`, `CRUD /api/branches`, branch-scoped middleware that auto-filters every query by the logged-in user's `branchId` (admins can switch branch context).
- **UI**: Announcements banner/feed on dashboard + admin composer; Branch switcher in TopBar (admin only); all existing pages (students/fees/attendance) become branch-aware.
- **Push notifications (web)**: service worker + Web Push API — announcement creation optionally triggers a push to subscribed users; overdue-fee cron job (Phase 7) also pushes a notification instead of only sitting in the DB.

### Phase 14 — Reports, Audit Log & Data Import/Export
- **Schema additions**: `AuditLog` (id, userId, action, entityType, entityId, before, after, timestamp) — written by a shared middleware/service wrapping all create/update/delete calls.
- **Endpoints**: `GET /api/reports/fees-trend`, `GET /api/reports/attendance-trend`, `GET /api/reports/class-breakdown`, `GET /api/audit-log` (admin only), `POST /api/students/import` (CSV/Excel via multer + `xlsx`/`papaparse`), `GET /api/:resource/export` (CSV/Excel).
- **UI**: Reports page with charts (Recharts) — fee collection over time, attendance trends, class-wise breakdown; Audit log table (filterable by user/entity/date) under Settings; Import/Export buttons on Students, Fees, Attendance list pages.

### Phase 15 — Auth Extras, PWA & Theme
- **Google/SSO login**: `passport-google-oauth20` (or Google Identity Services) alongside existing email/password JWT flow — same `User` table, `authProvider` field added.
- **PWA**: manifest.json + service worker (Vite PWA plugin) — installable, caches shell + last-fetched dashboard/student data for offline *viewing* (no offline writes/sync — that complexity is intentionally not being reintroduced).
- **Dark/light theme toggle**: `ThemeContext` + a light palette added alongside the existing dark tokens in `theme.css`; toggle in TopBar/Settings, persisted per-user.

## Updated phase count: 15 total
Core app = Phases 1–10. Selected extensions = Phases 11–15. Order can be
adjusted anytime — just say which phase to do next.
