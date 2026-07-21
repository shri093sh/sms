import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { csvEscape } from "../utils/csv.js";
import { writeAuditLog } from "../utils/audit.js";

// GET /api/installments?status=overdue|pending|paid&className=&section=
// Used by the Fees page's "overdue" tab and by the dashboard-adjacent
// views. Always includes the parent student's name/class for display.
export async function list(req, res, next) {
  try {
    const { status, className, section } = req.query;

    const where = {
      ...(status ? { status } : {}),
      ...(className || section
        ? {
            feePlan: {
              student: {
                ...(className ? { className } : {}),
                ...(section ? { section } : {})
              }
            }
          }
        : {})
    };

    const installments = await prisma.installment.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: { feePlan: { include: { student: { select: { id: true, name: true, className: true, section: true } } } } }
    });

    res.json({ installments });
  } catch (err) {
    next(err);
  }
}

// POST /api/installments/:id/pay — marks an installment paid. Idempotent
// on an already-paid installment (returns it unchanged rather than
// erroring, since double-clicking "mark as paid" shouldn't be an error
// state for the user).
export async function pay(req, res, next) {
  try {
    const existing = await prisma.installment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Installment not found");

    if (existing.status === "paid") {
      return res.json({ installment: existing });
    }

    const { paidDate } = req.body || {};
    const parsedPaidDate = paidDate ? new Date(paidDate) : new Date();
    if (Number.isNaN(parsedPaidDate.getTime())) {
      throw new ValidationError("Invalid paidDate", { paidDate: "Must be a valid date" });
    }

    const installment = await prisma.installment.update({
      where: { id: existing.id },
      data: { status: "paid", paidDate: parsedPaidDate }
    });

    writeAuditLog({
      userId: req.user?.id,
      action: "pay",
      entityType: "Installment",
      entityId: installment.id,
      before: { status: existing.status },
      after: { status: installment.status, paidDate: installment.paidDate }
    });

    res.json({ installment });
  } catch (err) {
    next(err);
  }
}

// GET /api/installments/export?status=&className=&section=  -> CSV
// Mirrors students/staff export: same query-param filtering as `list`,
// flattened student/class columns since this is the payments ledger, not
// a fee-plan editor.
export async function exportCsv(req, res, next) {
  try {
    const { status, className, section } = req.query;

    const where = {
      ...(status ? { status } : {}),
      ...(className || section
        ? {
            feePlan: {
              student: {
                ...(className ? { className } : {}),
                ...(section ? { section } : {})
              }
            }
          }
        : {})
    };

    const installments = await prisma.installment.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: { feePlan: { include: { student: { select: { name: true, className: true, section: true } } } } }
    });

    const header = "Student,Class,Section,Amount,Due Date,Status,Paid Date\n";
    const rows = installments
      .map((i) =>
        [
          csvEscape(i.feePlan.student.name),
          csvEscape(i.feePlan.student.className),
          csvEscape(i.feePlan.student.section),
          i.amount,
          i.dueDate.toISOString().slice(0, 10),
          i.status,
          i.paidDate ? i.paidDate.toISOString().slice(0, 10) : ""
        ].join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="fees-export.csv"');
    res.send(header + rows + (rows ? "\n" : ""));
  } catch (err) {
    next(err);
  }
}

// GET /api/installments/:id/receipt — everything a printable receipt
// needs in one payload (installment + fee plan + student).
export async function receipt(req, res, next) {
  try {
    const installment = await prisma.installment.findUnique({
      where: { id: req.params.id },
      include: { feePlan: { include: { student: true } } }
    });
    if (!installment) throw new NotFoundError("Installment not found");
    if (installment.status !== "paid") {
      throw new ValidationError("Only paid installments have a receipt");
    }

    res.json({ installment });
  } catch (err) {
    next(err);
  }
}
