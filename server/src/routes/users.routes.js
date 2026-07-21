import { Router } from "express";
import { list, updateRole, deactivate, activate } from "../controllers/users.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Every route here is admin-only — user management is entirely an admin
// concern. New-account creation lives at POST /api/auth/register
// (already admin-gated) rather than being duplicated here.
router.use(requireAuth, requireRole("admin"));

router.get("/", list);
router.put("/:id", updateRole);
router.post("/:id/deactivate", deactivate);
router.post("/:id/activate", activate);

export default router;
