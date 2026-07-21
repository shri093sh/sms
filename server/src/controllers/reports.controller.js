import { prisma } from "../config/db.js";
import { branchScope } from "../utils/branchScope.js";

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) });
  }
  return months;
}

// GET /api/reports/fees-trend?months=6
// Monthly totals of paid installments (by paidDate) over the trailing N
// months (default 6). Grouped in JS rather than a raw SQL date_trunc —
// the row count here (paid installments in a school-sized DB) is small
// enough that this stays simple without a real cost.
export async function feesTrend(req, res, next) {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
    const buckets = lastNMonths(months);
    const rangeStart = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);

    const installments = await prisma.installment.findMany({
      where: {
        status: "paid",
        paidDate: { gte: rangeStart },
        ...(req.branchId ? { feePlan: { student: branchScope(req) } } : {})
      },
      select: { amount: true, paidDate: true }
    });

    const totals = new Map(buckets.map((b) => [b.key, 0]));
    for (const inst of installments) {
      const key = monthKey(new Date(inst.paidDate));
      if (totals.has(key)) totals.set(key, totals.get(key) + Number(inst.amount));
    }

    res.json({ trend: buckets.map((b) => ({ month: b.key, label: b.label, totalCollected: totals.get(b.key) })) });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/attendance-trend?months=6
// Monthly attendance % (present + late counted as "showed up", matching
// the dashboard's today's-attendance-% calculation) over the trailing N
// months.
export async function attendanceTrend(req, res, next) {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
    const buckets = lastNMonths(months);
    const rangeStart = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);

    const records = await prisma.attendanceRecord.findMany({
      where: { date: { gte: rangeStart }, ...(req.branchId ? { student: branchScope(req) } : {}) },
      select: { date: true, status: true }
    });

    const totals = new Map(buckets.map((b) => [b.key, { present: 0, total: 0 }]));
    for (const r of records) {
      const key = monthKey(new Date(r.date));
      const bucket = totals.get(key);
      if (!bucket) continue;
      bucket.total++;
      if (r.status === "present" || r.status === "late") bucket.present++;
    }

    res.json({
      trend: buckets.map((b) => {
        const { present, total } = totals.get(b.key);
        return {
          month: b.key,
          label: b.label,
          attendancePct: total > 0 ? Math.round((present / total) * 1000) / 10 : null,
          totalMarked: total
        };
      })
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/class-breakdown
// Per active class/section: student count, fees collected this month for
// that class's students, and this month's attendance %.
export async function classBreakdown(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const students = await prisma.student.findMany({
      where: { status: "active", ...branchScope(req) },
      select: { id: true, className: true, section: true }
    });

    if (students.length === 0) return res.json({ breakdown: [] });

    const studentIds = students.map((s) => s.id);
    const [paidInstallments, attendanceRecords] = await Promise.all([
      prisma.installment.findMany({
        where: { status: "paid", paidDate: { gte: monthStart }, feePlan: { studentId: { in: studentIds } } },
        select: { amount: true, feePlan: { select: { studentId: true } } }
      }),
      prisma.attendanceRecord.findMany({
        where: { date: { gte: monthStart }, studentId: { in: studentIds } },
        select: { studentId: true, status: true }
      })
    ]);

    const feesByStudent = new Map();
    for (const inst of paidInstallments) {
      const sid = inst.feePlan.studentId;
      feesByStudent.set(sid, (feesByStudent.get(sid) || 0) + Number(inst.amount));
    }
    const attendanceByStudent = new Map();
    for (const rec of attendanceRecords) {
      const bucket = attendanceByStudent.get(rec.studentId) || { present: 0, total: 0 };
      bucket.total++;
      if (rec.status === "present" || rec.status === "late") bucket.present++;
      attendanceByStudent.set(rec.studentId, bucket);
    }

    const groups = new Map(); // "className|section" -> { className, section, studentCount, feesCollected, presentSum, totalSum }
    for (const s of students) {
      const key = `${s.className}|${s.section}`;
      const group = groups.get(key) || {
        className: s.className,
        section: s.section,
        studentCount: 0,
        feesCollected: 0,
        presentSum: 0,
        totalSum: 0
      };
      group.studentCount++;
      group.feesCollected += feesByStudent.get(s.id) || 0;
      const att = attendanceByStudent.get(s.id);
      if (att) {
        group.presentSum += att.present;
        group.totalSum += att.total;
      }
      groups.set(key, group);
    }

    const breakdown = Array.from(groups.values())
      .map((g) => ({
        className: g.className,
        section: g.section,
        studentCount: g.studentCount,
        feesCollectedThisMonth: g.feesCollected,
        attendancePctThisMonth: g.totalSum > 0 ? Math.round((g.presentSum / g.totalSum) * 1000) / 10 : null
      }))
      .sort((a, b) => a.className.localeCompare(b.className) || a.section.localeCompare(b.section));

    res.json({ breakdown });
  } catch (err) {
    next(err);
  }
}
