import { Router } from "express";
import { list, getOne, create, update, archive, restore, exportCsv, importCsv } from "../controllers/staff.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { uploadCsv } from "../middleware/upload.js";

const router = Router();

// View: any authenticated user (teacher needs the roster to see who covers
// which subject, e.g. from the Timetable page). Mutate: admin only.
// /export must be registered before /:id or Express would try to match
// it as an :id param.
router.get("/export", requireAuth, exportCsv);
router.get("/", requireAuth, list);
router.get("/:id", requireAuth, getOne);
router.post("/", requireAuth, requireRole("admin"), create);
router.post("/import", requireAuth, requireRole("admin"), uploadCsv.single("file"), importCsv);
router.put("/:id", requireAuth, requireRole("admin"), update);
router.post("/:id/archive", requireAuth, requireRole("admin"), archive);
router.post("/:id/restore", requireAuth, requireRole("admin"), restore);

export default router;
