import { Router } from "express";
import { list, getOne, create, update, archive, restore, classes, exportCsv, importCsv } from "../controllers/students.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { uploadCsv } from "../middleware/upload.js";

const router = Router();

// View: all authenticated roles (teacher needs the roster for attendance,
// accountant needs it for fees). Mutate: admin only, per PROGRESS.md's
// role map — student records are administrative data.
// /meta/classes and /export must be registered before /:id or Express
// would try to match them as an :id param.
router.get("/meta/classes", requireAuth, classes);
router.get("/export", requireAuth, exportCsv);
router.get("/", requireAuth, list);
router.get("/:id", requireAuth, getOne);
router.post("/", requireAuth, requireRole("admin"), create);
router.post("/import", requireAuth, requireRole("admin"), uploadCsv.single("file"), importCsv);
router.put("/:id", requireAuth, requireRole("admin"), update);
router.post("/:id/archive", requireAuth, requireRole("admin"), archive);
router.post("/:id/restore", requireAuth, requireRole("admin"), restore);

export default router;
