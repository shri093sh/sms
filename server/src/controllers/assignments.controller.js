import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export async function list(req, res, next) {
  try {
    const { className } = req.query;
    const assignments = await prisma.assignment.findMany({
      where: className ? { className } : undefined,
      include: { staff: { select: { id: true, name: true } } },
      orderBy: { dueDate: "desc" }
    });
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        staff: { select: { id: true, name: true } },
        submissions: { include: { student: { select: { id: true, name: true, rollNo: true } } } }
      }
    });
    if (!assignment) throw new NotFoundError("Assignment not found");
    res.json({ assignment });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { className, subject, title, dueDate, staffId } = req.body || {};
    const errors = {};
    if (!className || !String(className).trim()) errors.className = "Class is required";
    if (!subject || !String(subject).trim()) errors.subject = "Subject is required";
    if (!title || !title.trim()) errors.title = "Title is required";
    if (!dueDate || isNaN(Date.parse(dueDate))) errors.dueDate = "A valid due date is required";
    if (Object.keys(errors).length) throw new ValidationError("Invalid assignment data", errors);

    if (staffId) {
      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!staff) throw new ValidationError("Invalid assignment data", { staffId: "Staff member not found" });
    }

    const assignment = await prisma.assignment.create({
      data: { className, subject: subject.trim(), title: title.trim(), dueDate: new Date(dueDate), staffId: staffId || null }
    });

    // Seed a pending Submission row for every active student in the class
    // so the tracker has a full roster to work from immediately.
    const roster = await prisma.student.findMany({ where: { className, status: "active" }, select: { id: true } });
    if (roster.length) {
      await prisma.submission.createMany({
        data: roster.map((s) => ({ assignmentId: assignment.id, studentId: s.id })),
        skipDuplicates: true
      });
    }

    res.status(201).json({ assignment });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Assignment not found");

    const { subject, title, dueDate, staffId } = req.body || {};
    const errors = {};
    if (subject !== undefined && !String(subject).trim()) errors.subject = "Subject is required";
    if (title !== undefined && !title.trim()) errors.title = "Title is required";
    if (dueDate !== undefined && isNaN(Date.parse(dueDate))) errors.dueDate = "A valid due date is required";
    if (Object.keys(errors).length) throw new ValidationError("Invalid assignment data", errors);

    if (staffId) {
      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!staff) throw new ValidationError("Invalid assignment data", { staffId: "Staff member not found" });
    }

    const assignment = await prisma.assignment.update({
      where: { id: existing.id },
      data: {
        ...(subject !== undefined ? { subject: subject.trim() } : {}),
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
        ...(staffId !== undefined ? { staffId: staffId || null } : {})
      }
    });
    res.json({ assignment });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Assignment not found");
    await prisma.assignment.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /api/assignments/:id/submissions — mark one student's submission
// status. Row is expected to already exist (seeded on assignment create),
// but upsert covers students added to the class afterward.
export async function markSubmission(req, res, next) {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) throw new NotFoundError("Assignment not found");

    const { studentId, status } = req.body || {};
    const errors = {};
    if (!studentId) errors.studentId = "Student is required";
    if (!status || !["pending", "submitted", "late"].includes(status)) {
      errors.status = "Status must be pending, submitted, or late";
    }
    if (Object.keys(errors).length) throw new ValidationError("Invalid submission data", errors);

    const submission = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
      update: { status, submittedAt: status === "pending" ? null : new Date() },
      create: { assignmentId: assignment.id, studentId, status, submittedAt: status === "pending" ? null : new Date() },
      include: { student: { select: { id: true, name: true, rollNo: true } } }
    });
    res.status(200).json({ submission });
  } catch (err) {
    next(err);
  }
}
