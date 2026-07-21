import { Router } from "express";
import { prisma } from "../config/db.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Phase 2: confirms the API can actually reach Postgres via Prisma,
// separate from the plain liveness check above.
router.get("/health/db", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    next(err);
  }
});

export default router;
