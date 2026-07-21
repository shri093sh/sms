import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

const MONTH_RE = /^\d{4}-\d{2}$/;

function validateMonth(month) {
  if (!month || !MONTH_RE.test(month)) {
    throw new ValidationError("Invalid month", { month: "Expected YYYY-MM" });
  }
}

// GET /api/payroll?month=YYYY-MM — records for that month, joined with staff.
export async function list(req, res, next) {
  try {
    const { month } = req.query;
    validateMonth(month);

    const records = await prisma.payrollRecord.findMany({
      where: { month },
      include: { staff: { select: { id: true, name: true, subject: true, status: true } } },
      orderBy: { staff: { name: "asc" } }
    });
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

// POST /api/payroll/generate — create zero-default records for every
// active staff member who doesn't already have one for that month.
// Existing records are left untouched (no overwrite of edits already made).
export async function generate(req, res, next) {
  try {
    const { month } = req.body || {};
    validateMonth(month);

    const activeStaff = await prisma.staff.findMany({ where: { status: "active" }, select: { id: true } });
    const existing = await prisma.payrollRecord.findMany({ where: { month }, select: { staffId: true } });
    const existingIds = new Set(existing.map((r) => r.staffId));
    const toCreate = activeStaff.filter((s) => !existingIds.has(s.id));

    if (toCreate.length) {
      await prisma.payrollRecord.createMany({
        data: toCreate.map((s) => ({ staffId: s.id, month, baseSalary: 0, deductions: 0, netPay: 0 }))
      });
    }

    const records = await prisma.payrollRecord.findMany({
      where: { month },
      include: { staff: { select: { id: true, name: true, subject: true, status: true } } },
      orderBy: { staff: { name: "asc" } }
    });
    res.status(201).json({ records, created: toCreate.length });
  } catch (err) {
    next(err);
  }
}

// PUT /api/payroll/:id — edit base salary / deductions for one record;
// netPay is recomputed server-side rather than trusted from the client.
export async function update(req, res, next) {
  try {
    const existing = await prisma.payrollRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Payroll record not found");

    const { baseSalary, deductions } = req.body || {};
    const errors = {};
    if (baseSalary !== undefined && (isNaN(Number(baseSalary)) || Number(baseSalary) < 0)) {
      errors.baseSalary = "Must be a non-negative number";
    }
    if (deductions !== undefined && (isNaN(Number(deductions)) || Number(deductions) < 0)) {
      errors.deductions = "Must be a non-negative number";
    }
    if (Object.keys(errors).length) throw new ValidationError("Invalid payroll data", errors);

    const nextBase = baseSalary !== undefined ? Number(baseSalary) : Number(existing.baseSalary);
    const nextDeductions = deductions !== undefined ? Number(deductions) : Number(existing.deductions);

    const record = await prisma.payrollRecord.update({
      where: { id: existing.id },
      data: { baseSalary: nextBase, deductions: nextDeductions, netPay: nextBase - nextDeductions },
      include: { staff: { select: { id: true, name: true, subject: true, status: true } } }
    });
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

// POST /api/payroll/:id/pay — mark a record paid as of now.
export async function markPaid(req, res, next) {
  try {
    const existing = await prisma.payrollRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Payroll record not found");

    const record = await prisma.payrollRecord.update({
      where: { id: existing.id },
      data: { paidOn: new Date() },
      include: { staff: { select: { id: true, name: true, subject: true, status: true } } }
    });
    res.json({ record });
  } catch (err) {
    next(err);
  }
}
