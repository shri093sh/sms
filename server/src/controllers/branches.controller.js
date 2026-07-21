import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

// List is auth-only (any role) — it populates the TopBar branch switcher
// for admins and is harmless for everyone else to read. Mutations are
// admin-only (see branches.routes.js).
export async function list(req, res, next) {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
    res.json({ branches });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
    if (!branch) throw new NotFoundError("Branch not found");
    res.json({ branch });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, address } = req.body || {};
    if (!name || !name.trim()) throw new ValidationError("name is required");

    const branch = await prisma.branch.create({
      data: { name: name.trim(), address: address || null }
    });
    res.status(201).json({ branch });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.branch.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Branch not found");

    const { name, address } = req.body || {};
    if (name !== undefined && !name.trim()) throw new ValidationError("name cannot be empty");

    const branch = await prisma.branch.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(address !== undefined ? { address } : {})
      }
    });
    res.json({ branch });
  } catch (err) {
    next(err);
  }
}

// Hard delete — a Branch has no history of its own (unlike Student/Staff),
// and the FK on User/Student/Staff is onDelete: SetNull, so removing a
// branch just un-assigns whoever was in it rather than orphaning records.
export async function remove(req, res, next) {
  try {
    const existing = await prisma.branch.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Branch not found");

    await prisma.branch.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
