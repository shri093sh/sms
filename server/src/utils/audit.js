import { prisma } from "../config/db.js";

// Called from controllers around create/update/archive/restore/import.
// Best-effort: a logging failure should never fail the request it's
// describing, so errors are swallowed (and logged server-side) rather
// than propagated to next().
//
// `before`/`after` should be small plain objects — the fields that
// actually changed, or a compact snapshot for creates/deletes — not the
// full Prisma row every time.
export async function writeAuditLog({ userId, action, entityType, entityId, before = null, after = null }) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId || null, action, entityType, entityId, before, after }
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
