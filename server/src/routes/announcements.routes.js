import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import * as announcementsController from "../controllers/announcements.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", announcementsController.list);
router.post("/", requireRole("admin"), announcementsController.create);
router.delete("/:id", requireRole("admin"), announcementsController.remove);

export default router;
