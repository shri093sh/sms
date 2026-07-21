import { Router } from "express";
import { reportCard } from "../controllers/exams.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

// Mounted at /api/students/:studentId/report-card (see index.js).
const router = Router({ mergeParams: true });

router.get("/", requireAuth, reportCard);

export default router;
