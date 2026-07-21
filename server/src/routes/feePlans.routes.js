import { Router } from "express";
import { listForStudent, createForStudent } from "../controllers/feePlans.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

// Mounted at /api/students/:studentId/fee-plans (see index.js).
const router = Router({ mergeParams: true });

// View: admin + accountant (fees is accountant's domain). Create:
// admin + accountant too — accountant needs to set up plans, not just
// collect payments.
router.get("/", requireAuth, requireRole("admin", "accountant"), listForStudent);
router.post("/", requireAuth, requireRole("admin", "accountant"), createForStudent);

export default router;
