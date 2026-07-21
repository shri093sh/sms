import { prisma } from "../config/db.js";

// Phase 5 — dashboard summary numbers. Kept as a handful of small,
// indexed queries run in parallel rather than one giant raw SQL statement,
// so each figure stays easy to reason about / adjust per-phase.
export async function summary(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      feesCollectedAgg,
      pendingInstallments,
      todayAttendance
    ] = await Promise.all([
      prisma.student.count({ where: { status: "active" } }),
      prisma.installment.aggregate({
        _sum: { amount: true },
        where: { status: "paid", paidDate: { gte: monthStart, lt: monthEnd } }
      }),
      prisma.installment.count({ where: { status: { in: ["pending", "overdue"] } } }),
      prisma.attendanceRecord.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { date: { gte: todayStart, lt: todayEnd } }
      })
    ]);

    const totalMarkedToday = todayAttendance.reduce((sum, row) => sum + row._count._all, 0);
    const presentToday = todayAttendance.find((row) => row.status === "present")?._count._all || 0;
    const attendancePct = totalMarkedToday > 0 ? Math.round((presentToday / totalMarkedToday) * 100) : null;

    res.json({
      totalStudents,
      feesCollectedThisMonth: Number(feesCollectedAgg._sum.amount || 0),
      pendingInstallments,
      todayAttendancePct: attendancePct, // null = nobody's attendance marked yet today
      todayAttendanceMarked: totalMarkedToday
    });
  } catch (err) {
    next(err);
  }
}

// Recent activity feed: last few payments + last few attendance marks,
// merged and sorted by time. Small, fixed-size queries (no pagination
// needed for a "recent activity" widget).
export async function activity(req, res, next) {
  try {
    const [recentPayments, recentAttendance] = await Promise.all([
      prisma.installment.findMany({
        where: { status: "paid" },
        orderBy: { paidDate: "desc" },
        take: 5,
        include: { feePlan: { include: { student: { select: { name: true } } } } }
      }),
      prisma.attendanceRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { student: { select: { name: true } } }
      })
    ]);

    const items = [
      ...recentPayments.map((p) => ({
        id: `payment-${p.id}`,
        type: "payment",
        message: `${p.feePlan.student.name} paid ₹${Number(p.amount).toLocaleString("en-IN")}`,
        at: p.paidDate
      })),
      ...recentAttendance.map((a) => ({
        id: `attendance-${a.id}`,
        type: "attendance",
        message: `${a.student.name} marked ${a.status}`,
        at: a.createdAt
      }))
    ]
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8);

    res.json({ items });
  } catch (err) {
    next(err);
  }
}
