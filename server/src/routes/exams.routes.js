import { Router } from "express";
import { list, getOne, create, update, remove, bulkGrades, reportCard } from "../controllers/exams.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// View: any authenticated role. Mutate exams + enter grades: admin/teacher
// (teachers own subject-level grade entry; accountant has no reason to
// touch academics). Report card is student-scoped, mounted separately
// under /api/students/:studentId/report-card in index.js.
router.get("/", requireAuth, list);
router.get("/:id", requireAuth, getOne);
router.post("/", requireAuth, requireRole("admin", "teacher"), create);
router.put("/:id", requireAuth, requireRole("admin", "teacher"), update);
router.delete("/:id", requireAuth, requireRole("admin"), remove);
router.post("/:id/grades", requireAuth, requireRole("admin", "teacher"), bulkGrades);

export default router;
