import { Router } from "express";
import { list, pay, receipt, exportCsv } from "../controllers/installments.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// /export must be registered before /:id or Express would try to match
// it as an :id param.
router.get("/export", requireAuth, requireRole("admin", "accountant"), exportCsv);
router.get("/", requireAuth, requireRole("admin", "accountant"), list);
router.post("/:id/pay", requireAuth, requireRole("admin", "accountant"), pay);
router.get("/:id/receipt", requireAuth, requireRole("admin", "accountant"), receipt);

export default router;
