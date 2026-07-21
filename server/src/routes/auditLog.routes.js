import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import * as auditLogController from "../controllers/auditLog.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), auditLogController.list);

export default router;
