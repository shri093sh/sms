import { Router } from "express";
import { roster, mark, summary, exportCsv } from "../controllers/attendance.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// View: any authenticated role (accountant/admin may want to check a
// student's attendance % alongside fees). Mark + export: admin/teacher
// only, per the existing role map — accountants don't touch attendance.
router.get("/roster", requireAuth, roster);
router.get("/summary", requireAuth, summary);
router.get("/export", requireAuth, requireRole("admin", "teacher"), exportCsv);
router.post("/", requireAuth, requireRole("admin", "teacher"), mark);

export default router;
