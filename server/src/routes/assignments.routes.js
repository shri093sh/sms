import { Router } from "express";
import { list, getOne, create, update, remove, markSubmission } from "../controllers/assignments.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Same role split as exams: view for everyone authenticated, mutate for
// admin/teacher.
router.get("/", requireAuth, list);
router.get("/:id", requireAuth, getOne);
router.post("/", requireAuth, requireRole("admin", "teacher"), create);
router.put("/:id", requireAuth, requireRole("admin", "teacher"), update);
router.delete("/:id", requireAuth, requireRole("admin"), remove);
router.post("/:id/submissions", requireAuth, requireRole("admin", "teacher"), markSubmission);

export default router;
