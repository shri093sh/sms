import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export async function list(req, res, next) {
  try {
    const { className } = req.query;
    const exams = await prisma.exam.findMany({
      where: className ? { className } : undefined,
      orderBy: { date: "desc" }
    });
    res.json({ exams });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { grades: { include: { student: { select: { id: true, name: true, rollNo: true } } } } }
    });
    if (!exam) throw new NotFoundError("Exam not found");
    res.json({ exam });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, className, date } = req.body || {};
    const errors = {};
    if (!name || !name.trim()) errors.name = "Name is required";
    if (!className || !String(className).trim()) errors.className = "Class is required";
    if (!date || isNaN(Date.parse(date))) errors.date = "A valid date is required";
    if (Object.keys(errors).length) throw new ValidationError("Invalid exam data", errors);

    const exam = await prisma.exam.create({ data: { name: name.trim(), className, date: new Date(date) } });
    res.status(201).json({ exam });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Exam not found");

    const { name, className, date } = req.body || {};
    const errors = {};
    if (name !== undefined && !name.trim()) errors.name = "Name is required";
    if (className !== undefined && !String(className).trim()) errors.className = "Class is required";
    if (date !== undefined && isNaN(Date.parse(date))) errors.date = "A valid date is required";
    if (Object.keys(errors).length) throw new ValidationError("Invalid exam data", errors);

    const exam = await prisma.exam.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(className !== undefined ? { className } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {})
      }
    });
    res.json({ exam });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const existing = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Exam not found");
    await prisma.exam.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /api/exams/:id/grades — bulk upsert: [{ studentId, subject, marks, maxMarks }]
export async function bulkGrades(req, res, next) {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) throw new NotFoundError("Exam not found");

    const rows = Array.isArray(req.body?.grades) ? req.body.grades : null;
    if (!rows || !rows.length) throw new ValidationError("Invalid grade data", { grades: "Expected a non-empty array" });

    for (const row of rows) {
      if (!row.studentId || !row.subject || row.marks === undefined || row.maxMarks === undefined) {
        throw new ValidationError("Invalid grade data", {
          grades: "Each row needs studentId, subject, marks, maxMarks"
        });
      }
      if (Number(row.marks) < 0 || Number(row.maxMarks) <= 0 || Number(row.marks) > Number(row.maxMarks)) {
        throw new ValidationError("Invalid grade data", { grades: "marks must be between 0 and maxMarks" });
      }
    }

    const grades = await prisma.$transaction(
      rows.map((row) =>
        prisma.grade.upsert({
          where: { examId_studentId_subject: { examId: exam.id, studentId: row.studentId, subject: row.subject } },
          update: { marks: Number(row.marks), maxMarks: Number(row.maxMarks) },
          create: {
            examId: exam.id,
            studentId: row.studentId,
            subject: row.subject,
            marks: Number(row.marks),
            maxMarks: Number(row.maxMarks)
          }
        })
      )
    );
    res.status(200).json({ grades });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/:studentId/report-card — every grade for a student,
// grouped by exam.
export async function reportCard(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
    if (!student) throw new NotFoundError("Student not found");

    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      include: { exam: { select: { id: true, name: true, className: true, date: true } } },
      orderBy: { exam: { date: "desc" } }
    });

    const byExam = new Map();
    for (const g of grades) {
      if (!byExam.has(g.examId)) byExam.set(g.examId, { exam: g.exam, subjects: [] });
      byExam.get(g.examId).subjects.push({ subject: g.subject, marks: g.marks, maxMarks: g.maxMarks });
    }

    res.json({ student: { id: student.id, name: student.name, rollNo: student.rollNo }, exams: [...byExam.values()] });
  } catch (err) {
    next(err);
  }
}
