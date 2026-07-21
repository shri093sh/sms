import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

// Fee plans are always created with an even installment schedule spaced
// one calendar month apart, starting from `startDate` (defaults to today).
// Uneven final installments (when totalAmount doesn't divide evenly) get
// the remainder folded into the last one so the sum always matches
// totalAmount exactly.
function buildInstallments(totalAmount, installmentCount, startDate) {
  const base = Math.floor((totalAmount * 100) / installmentCount) / 100;
  const installments = [];
  let allocated = 0;

  for (let i = 0; i < installmentCount; i++) {
    const isLast = i === installmentCount - 1;
    const amount = isLast ? Math.round((totalAmount - allocated) * 100) / 100 : base;
    allocated += amount;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    installments.push({ amount, dueDate, status: "pending" });
  }

  return installments;
}

export async function listForStudent(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
    if (!student) throw new NotFoundError("Student not found");

    const feePlans = await prisma.feePlan.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      include: { installments: { orderBy: { dueDate: "asc" } } }
    });

    res.json({ feePlans });
  } catch (err) {
    next(err);
  }
}

export async function createForStudent(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
    if (!student) throw new NotFoundError("Student not found");

    const { totalAmount, installmentCount, startDate } = req.body || {};
    const errors = {};
    const amountNum = Number(totalAmount);
    const countNum = parseInt(installmentCount, 10);

    if (!totalAmount || Number.isNaN(amountNum) || amountNum <= 0) {
      errors.totalAmount = "Total amount must be a positive number";
    }
    if (!installmentCount || Number.isNaN(countNum) || countNum < 1 || countNum > 24) {
      errors.installmentCount = "Installment count must be between 1 and 24";
    }
    if (Object.keys(errors).length) throw new ValidationError("Invalid fee plan", errors);

    const start = startDate ? new Date(startDate) : new Date();
    const schedule = buildInstallments(amountNum, countNum, start);

    const feePlan = await prisma.feePlan.create({
      data: {
        studentId: student.id,
        totalAmount: amountNum,
        installmentCount: countNum,
        startDate: start,
        installments: { create: schedule }
      },
      include: { installments: { orderBy: { dueDate: "asc" } } }
    });

    res.status(201).json({ feePlan });
  } catch (err) {
    next(err);
  }
}
