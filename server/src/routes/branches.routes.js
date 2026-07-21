import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import * as branchesController from "../controllers/branches.controller.js";

const router = Router();

router.use(requireAuth);

// Any authenticated role can list branches — this is what populates the
// TopBar branch switcher (admin-only UI) and any future branch dropdowns;
// reading the list itself isn't sensitive.
router.get("/", branchesController.list);
router.get("/:id", branchesController.getOne);

router.post("/", requireRole("admin"), branchesController.create);
router.put("/:id", requireRole("admin"), branchesController.update);
router.delete("/:id", requireRole("admin"), branchesController.remove);

export default router;
