import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import studentsRoutes from "./routes/students.routes.js";
import feePlansRoutes from "./routes/feePlans.routes.js";
import installmentsRoutes from "./routes/installments.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import usersRoutes from "./routes/users.routes.js";
import backupsRoutes from "./routes/backups.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import examsRoutes from "./routes/exams.routes.js";
import assignmentsRoutes from "./routes/assignments.routes.js";
import reportCardRoutes from "./routes/reportCard.routes.js";
import branchesRoutes from "./routes/branches.routes.js";
import announcementsRoutes from "./routes/announcements.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import { startOverdueSweep } from "./jobs/overdueSweep.js";
import { startBackupScheduler } from "./jobs/backupJob.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";

const app = express();

// credentials: true + explicit origin (not "*") is required for the
// httpOnly refresh-token cookie to be sent/received cross-origin in dev
// (client on :5173, server on :4000).
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/students/:studentId/fee-plans", feePlansRoutes);
app.use("/api/installments", installmentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/backups", backupsRoutes);

app.use("/api/staff", staffRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/exams", examsRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/students/:studentId/report-card", reportCardRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-log", auditLogRoutes);

// Phase 15 (Google/SSO login, PWA, theme) gets mounted here as it's built.

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[Prerana SMS API] listening on http://localhost:${env.port}`);
  startOverdueSweep();
  startBackupScheduler();
});
