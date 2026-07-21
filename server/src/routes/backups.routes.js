import { Router } from "express";
import { list, runNow, download } from "../controllers/backups.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", list);
router.post("/run", runNow);
router.get("/:id/download", download);

export default router;
