import { verifyAccessToken } from "../utils/jwt.js";
import { AuthError, ForbiddenError } from "../utils/errors.js";

// Verifies the short-lived access token sent as `Authorization: Bearer <token>`.
// Does NOT touch the database — req.user is built entirely from the token
// payload, so this stays cheap on every protected request.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AuthError("Missing or invalid Authorization header"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email, branchId: payload.branchId ?? null };

    // Phase 13 — resolve the branch context once per request. Admins can
    // override which branch they're viewing via X-Branch-Id (see
    // BranchContext.jsx / TopBar branch switcher on the client); every
    // other role is pinned to their own branchId. branchScope.js and the
    // students/staff controllers read this off req.branchId.
    const overrideBranchId = req.user.role === "admin" ? req.headers["x-branch-id"] : null;
    req.branchId = overrideBranchId || req.user.branchId || null;

    next();
  } catch {
    next(new AuthError("Invalid or expired token"));
  }
}

// Usage: router.get("/reports", requireAuth, requireRole("admin", "accountant"), handler)
// Role map (ported from the original app's MESH_EVENT_PERMISSIONS):
//   admin       - full access to every resource
//   accountant  - fees/EMI + reports, read-only elsewhere
//   teacher     - attendance + student view only
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AuthError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`This action requires role: ${roles.join(" or ")}`));
    }
    next();
  };
}
