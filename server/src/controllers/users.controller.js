import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

const VALID_ROLES = ["admin", "teacher", "accountant"];

function toPublicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// GET /api/users — admin only. Account creation stays on the existing
// POST /api/auth/register (already admin-gated, already handles password
// hashing + duplicate-email checks) rather than duplicating that logic
// here; this controller covers the list/role/active-state management
// that register doesn't.
export async function list(req, res, next) {
  try {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    res.json({ users: users.map(toPublicUser) });
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("User not found");

    const { role, name } = req.body || {};
    if (role && !VALID_ROLES.includes(role)) {
      throw new ValidationError(`role must be one of: ${VALID_ROLES.join(", ")}`);
    }
    if (role === undefined && name === undefined) {
      throw new ValidationError("Provide at least one of: role, name");
    }
    // Guard against an admin locking themselves out by demoting their own
    // last-admin account — cheap check, only matters in the rare case.
    if (role && role !== "admin" && existing.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin", isActive: true } });
      if (adminCount <= 1) {
        throw new ValidationError("Can't demote the last active admin account");
      }
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {})
      }
    });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("User not found");
    if (existing.id === req.user.id) {
      throw new ValidationError("You can't deactivate your own account");
    }
    if (existing.role === "admin") {
      const activeAdmins = await prisma.user.count({ where: { role: "admin", isActive: true } });
      if (activeAdmins <= 1) {
        throw new ValidationError("Can't deactivate the last active admin account");
      }
    }

    const user = await prisma.user.update({ where: { id: existing.id }, data: { isActive: false } });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function activate(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("User not found");

    const user = await prisma.user.update({ where: { id: existing.id }, data: { isActive: true } });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
