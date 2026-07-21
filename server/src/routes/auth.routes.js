import { Router } from "express";
import { register, login, googleLogin, refresh, logout, me } from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Admin-only: creating staff accounts is an admin action, not public
// self-registration (there's always at least the seeded admin to start from).
router.post("/register", requireAuth, requireRole("admin"), register);

router.post("/login", loginRateLimiter, login);
router.post("/google", loginRateLimiter, googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
