import { Router } from "express";
import { grid, upsertSlot, deleteSlot } from "../controllers/timetable.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// View: admin + teacher (teachers need to see their own schedule).
// Edit: admin only.
router.get("/", requireAuth, requireRole("admin", "teacher"), grid);
router.post("/slot", requireAuth, requireRole("admin"), upsertSlot);
router.delete("/slot/:id", requireAuth, requireRole("admin"), deleteSlot);

export default router;
