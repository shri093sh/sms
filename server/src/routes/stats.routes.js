import { Router } from "express";
import { summary, activity } from "../controllers/stats.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Any authenticated role can see dashboard stats (admin/teacher/accountant
// all land on the same dashboard) — no requireRole gate here.
router.get("/summary", requireAuth, summary);
router.get("/activity", requireAuth, activity);

export default router;
