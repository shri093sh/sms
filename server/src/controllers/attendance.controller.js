import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

const VALID_STATUSES = new Set(["present", "absent", "late"]);

// Attendance is stored as a plain @db.Date column. Parsing "YYYY-MM-DD" as
// UTC midnight (rather than letting `new Date(str)` apply the server's
// local zone) keeps the stored date stable regardless of where the Node
// process runs — a date the teacher picks is the date that gets saved.
function parseDateOnly(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// GET /api/attendance/roster?className=&section=&date=YYYY-MM-DD
// Full active roster for the class/section, merged with any attendance
// already marked for that date (status: null where unmarked yet) — the
// marking grid always shows every student, not just the ones marked so
// far.
export async function roster(req, res, next) {
  try {
    const { className, section, date } = req.query;
    if (!className || !section || !date) {
      throw new ValidationError("className, section and date are required");
    }
    const parsedDate = parseDateOnly(date);
    if (!parsedDate) throw new ValidationError("Invalid date", { date: "Must be YYYY-MM-DD" });

    const students = await prisma.student.findMany({
      where: { className, section, status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, rollNo: true }
    });

    const records = await prisma.attendanceRecord.findMany({
      where: { date: parsedDate, student: { className, section } },
      select: { id: true, studentId: true, status: true }
    });
    const byStudent = new Map(records.map((r) => [r.studentId, r]));

    res.json({
      date,
      students: students.map((s) => ({
        ...s,
        status: byStudent.get(s.id)?.status ?? null,
        recordId: byStudent.get(s.id)?.id ?? null
      }))
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance  { date, records: [{ studentId, status }] }
// Bulk upsert — one call per "save" click on the marking grid, not one
// request per student. Upsert (not create) so re-saving the same day just
// overwrites, matching the roster endpoint's "always show every student"
// behavior.
export async function mark(req, res, next) {
  try {
    const { date, records } = req.body || {};
    const parsedDate = parseDateOnly(date);
    if (!parsedDate) throw new ValidationError("Invalid date", { date: "Must be YYYY-MM-DD" });
    if (!Array.isArray(records) || records.length === 0) {
      throw new ValidationError("records must be a non-empty array");
    }
    for (const r of records) {
      if (!r || typeof r.studentId !== "string" || !VALID_STATUSES.has(r.status)) {
        throw new ValidationError("Each record needs a studentId and a valid status (present/absent/late)");
      }
    }

    const results = await prisma.$transaction(
      records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { studentId_date: { studentId: r.studentId, date: parsedDate } },
          update: { status: r.status, markedById: req.user.id },
          create: { studentId: r.studentId, date: parsedDate, status: r.status, markedById: req.user.id }
        })
      )
    );

    res.json({ records: results });
  } catch (err) {
    next(err);
  }
}

// GET /api/attendance/summary?studentId=&month=YYYY-MM
// Per-student monthly view: every marked day plus present/absent/late
// counts and an attendance %. Late counts toward "present" for the
// percentage (the student showed up), consistent with the dashboard's
// today's-attendance-% calculation in Phase 5.
export async function summary(req, res, next) {
  try {
    const { studentId, month } = req.query;
    if (!studentId || !month) throw new ValidationError("studentId and month are required");
    if (!/^\d{4}-\d{2}$/.test(month)) throw new ValidationError("Invalid month", { month: "Must be YYYY-MM" });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, className: true, section: true }
    });
    if (!student) throw new NotFoundError("Student not found");

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" }
    });

    const presentCount = records.filter((r) => r.status === "present").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const totalMarked = records.length;
    const percentage = totalMarked ? Math.round(((presentCount + lateCount) / totalMarked) * 1000) / 10 : null;

    res.json({ student, month, records, presentCount, absentCount, lateCount, totalMarked, percentage });
  } catch (err) {
    next(err);
  }
}

// GET /api/attendance/export?className=&section=&from=&to=  -> CSV
// All filters optional — no filters at all exports every record ever
// marked, so the UI nudges toward picking at least a date range.
export async function exportCsv(req, res, next) {
  try {
    const { className, section, from, to } = req.query;
    const fromDate = from ? parseDateOnly(from) : null;
    const toDate = to ? parseDateOnly(to) : null;
    if ((from && !fromDate) || (to && !toDate)) {
      throw new ValidationError("Invalid from/to date", { date: "Must be YYYY-MM-DD" });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(fromDate || toDate
          ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
          : {}),
        ...(className || section
          ? { student: { ...(className ? { className } : {}), ...(section ? { section } : {}) } }
          : {})
      },
      orderBy: [{ date: "asc" }],
      include: { student: { select: { name: true, rollNo: true, className: true, section: true } } }
    });

    const header = "Date,Name,Roll No,Class,Section,Status\n";
    const rows = records
      .map((r) =>
        [
          r.date.toISOString().slice(0, 10),
          csvEscape(r.student.name),
          csvEscape(r.student.rollNo),
          csvEscape(r.student.className),
          csvEscape(r.student.section),
          r.status
        ].join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="attendance-export.csv"');
    res.send(header + rows + (rows ? "\n" : ""));
  } catch (err) {
    next(err);
  }
}
