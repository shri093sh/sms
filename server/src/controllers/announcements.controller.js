import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

const VALID_AUDIENCE = new Set(["admin", "teacher", "accountant", "all"]);

// GET /api/announcements — every role can read, but only sees
// announcements addressed to "all" or to their own role, and only ones
// that haven't expired. Admins additionally get everything via
// ?includeExpired=1 (used by a future "manage announcements" view).
export async function list(req, res, next) {
  try {
    const includeExpired = req.user.role === "admin" && req.query.includeExpired === "1";

    const announcements = await prisma.announcement.findMany({
      where: {
        audience: { hasSome: ["all", req.user.role] },
        ...(includeExpired ? {} : { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] })
      },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } }
    });
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { title, body, audience, expiresAt } = req.body || {};
    if (!title || !title.trim()) throw new ValidationError("title is required");
    if (!body || !body.trim()) throw new ValidationError("body is required");

    const audienceList = Array.isArray(audience) && audience.length > 0 ? audience : ["all"];
    const invalid = audienceList.filter((a) => !VALID_AUDIENCE.has(a));
    if (invalid.length > 0) {
      throw new ValidationError("Invalid audience value(s)", { audience: `Unknown: ${invalid.join(", ")}` });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        audience: audienceList,
        createdBy: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: { author: { select: { id: true, name: true } } }
    });
    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Announcement not found");

    await prisma.announcement.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
