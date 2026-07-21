import { prisma } from "../config/db.js";

const PAGE_SIZE_DEFAULT = 30;

// GET /api/audit-log?entityType=&userId=&from=&to=&page=&pageSize=
// Admin only (see audit-log.routes.js). Filters are all optional — no
// filters returns the most recent activity across every entity.
export async function list(req, res, next) {
  try {
    const { entityType, userId, from, to, page = "1", pageSize = String(PAGE_SIZE_DEFAULT) } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));

    const where = {
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {})
            }
          }
        : {})
    };

    const [total, entries] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * size,
        take: size,
        include: { user: { select: { id: true, name: true, email: true } } }
      })
    ]);

    res.json({
      entries,
      pagination: { page: pageNum, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) }
    });
  } catch (err) {
    next(err);
  }
}
