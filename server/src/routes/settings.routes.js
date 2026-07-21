import { Router } from "express";
import { get, update } from "../controllers/settings.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Read: any authenticated role (TopBar/org-name display could use this
// later without needing admin rights). Write: admin only.
router.get("/", requireAuth, get);
router.put("/", requireAuth, requireRole("admin"), update);

export default router;
