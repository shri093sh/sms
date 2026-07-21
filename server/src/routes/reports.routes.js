import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import * as reportsController from "../controllers/reports.controller.js";

const router = Router();

// admin: full access. accountant: fees/EMI + reports, per the role map in
// PROGRESS.md. teacher doesn't get reports (attendance + student view only).
router.use(requireAuth, requireRole("admin", "accountant"));

router.get("/fees-trend", reportsController.feesTrend);
router.get("/attendance-trend", reportsController.attendanceTrend);
router.get("/class-breakdown", reportsController.classBreakdown);

export default router;
