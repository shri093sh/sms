// Phase 13 — multi-branch scoping.
//
// `req.branchId` is resolved once, in requireAuth (see auth.middleware.js):
// non-admins are pinned to their own branchId; admins may override which
// branch they're viewing by sending an `X-Branch-Id` header (see
// BranchContext.jsx on the client — the TopBar branch switcher). If no
// branchId applies (single-branch install, or a user not yet assigned to
// a branch), req.branchId is null and no filter is applied — this keeps
// schools that don't use branches working exactly as before Phase 13.
//
// Spread this into any Prisma `where` clause: `{ ...branchScope(req), ... }`.
export function branchScope(req) {
  return req.branchId ? { branchId: req.branchId } : {};
}
