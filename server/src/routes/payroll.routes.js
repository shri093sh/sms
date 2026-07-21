import { Router } from "express";
import { list, generate, update, markPaid } from "../controllers/payroll.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Payroll is financial/HR data — admin only, every action.
router.get("/", requireAuth, requireRole("admin"), list);
router.post("/generate", requireAuth, requireRole("admin"), generate);
router.put("/:id", requireAuth, requireRole("admin"), update);
router.post("/:id/pay", requireAuth, requireRole("admin"), markPaid);

export default router;
