import { prisma } from "../config/db.js";
import { ValidationError } from "../utils/errors.js";

const MAX_DAY = 5; // 0 = Monday .. 5 = Saturday
const MAX_PERIOD = 10;

// GET /api/timetable?className=&section= — full grid for that class/section.
export async function grid(req, res, next) {
  try {
    const { className, section } = req.query;
    if (!className || !section) {
      throw new ValidationError("className and section are required", {
        className: !className ? "Required" : undefined,
        section: !section ? "Required" : undefined
      });
    }

    const slots = await prisma.timetableSlot.findMany({
      where: { className, section },
      include: { staff: { select: { id: true, name: true, subject: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }]
    });
    res.json({ slots });
  } catch (err) {
    next(err);
  }
}

// POST /api/timetable/slot — upsert a single cell (subject/staff for a
// class/section/day/period). Passing subject: "" clears the slot's subject
// and staff assignment but keeps no row if it never existed.
export async function upsertSlot(req, res, next) {
  try {
    const { className, section, dayOfWeek, period, subject, staffId } = req.body || {};

    const errors = {};
    if (!className || !String(className).trim()) errors.className = "Class is required";
    if (!section || !String(section).trim()) errors.section = "Section is required";
    if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > MAX_DAY) {
      errors.dayOfWeek = `Day must be between 0 and ${MAX_DAY}`;
    }
    if (period === undefined || period === null || period < 1 || period > MAX_PERIOD) {
      errors.period = `Period must be between 1 and ${MAX_PERIOD}`;
    }
    if (!subject || !String(subject).trim()) errors.subject = "Subject is required";
    if (Object.keys(errors).length) throw new ValidationError("Invalid timetable slot", errors);

    if (staffId) {
      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!staff) throw new ValidationError("Invalid timetable slot", { staffId: "Staff member not found" });
    }

    const slot = await prisma.timetableSlot.upsert({
      where: { className_section_dayOfWeek_period: { className, section, dayOfWeek, period } },
      update: { subject: subject.trim(), staffId: staffId || null },
      create: { className, section, dayOfWeek, period, subject: subject.trim(), staffId: staffId || null },
      include: { staff: { select: { id: true, name: true, subject: true } } }
    });
    res.status(200).json({ slot });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/timetable/slot/:id — clear a cell entirely.
export async function deleteSlot(req, res, next) {
  try {
    await prisma.timetableSlot.delete({ where: { id: req.params.id } }).catch(() => null);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
