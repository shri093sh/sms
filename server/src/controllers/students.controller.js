import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { validateStudentInput } from "../utils/studentValidation.js";
import { branchScope } from "../utils/branchScope.js";
import { writeAuditLog } from "../utils/audit.js";
import { csvEscape, parseCsv } from "../utils/csv.js";

const SORTABLE_FIELDS = new Set(["name", "rollNo", "className", "section", "admissionDate"]);

export async function list(req, res, next) {
  try {
    const {
      q,
      className,
      section,
      status = "active",
      sort = "name",
      dir = "asc",
      page = "1",
      pageSize = "20"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const sortField = SORTABLE_FIELDS.has(sort) ? sort : "name";
    const sortDir = dir === "desc" ? "desc" : "asc";

    const where = {
      ...branchScope(req),
      ...(status !== "all" ? { status } : {}),
      ...(className ? { className } : {}),
      ...(section ? { section } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { rollNo: { contains: q, mode: "insensitive" } },
              { guardianName: { contains: q, mode: "insensitive" } },
              { guardianPhone: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: { [sortField]: sortDir },
        skip: (pageNum - 1) * size,
        take: size
      })
    ]);

    res.json({
      students,
      pagination: { page: pageNum, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/meta/classes — distinct active class/section
// combinations, used to populate the Attendance page's class/section
// pickers (and reusable anywhere else a "which classes exist" dropdown
// is needed) without loading every student record client-side.
export async function classes(req, res, next) {
  try {
    const rows = await prisma.student.findMany({
      where: { status: "active", ...branchScope(req) },
      select: { className: true, section: true },
      distinct: ["className", "section"],
      orderBy: [{ className: "asc" }, { section: "asc" }]
    });
    res.json({ classes: rows });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!student) throw new NotFoundError("Student not found");
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, rollNo, className, section, guardianName, guardianPhone } = req.body || {};
    const { valid, errors } = validateStudentInput(req.body || {});
    if (!valid) throw new ValidationError("Invalid student data", errors);

    const duplicate = await prisma.student.findUnique({
      where: { rollNo_className_section: { rollNo, className, section } }
    });
    if (duplicate) {
      throw new ValidationError("A student with this roll number already exists in that class/section", {
        rollNo: "Already in use for this class/section"
      });
    }

    const student = await prisma.student.create({
      data: { name: name.trim(), rollNo, className, section, guardianName, guardianPhone, branchId: req.branchId || null }
    });
    writeAuditLog({
      userId: req.user.id,
      action: "create",
      entityType: "Student",
      entityId: student.id,
      after: { name: student.name, rollNo: student.rollNo, className: student.className, section: student.section }
    });
    res.status(201).json({ student });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Student not found");

    const { valid, errors } = validateStudentInput(req.body || {}, { partial: true });
    if (!valid) throw new ValidationError("Invalid student data", errors);

    const { name, rollNo, className, section, guardianName, guardianPhone } = req.body || {};

    // Only re-check the uniqueness constraint if the identity fields
    // (roll/class/section) actually changed.
    const nextRollNo = rollNo ?? existing.rollNo;
    const nextClassName = className ?? existing.className;
    const nextSection = section ?? existing.section;
    if (nextRollNo !== existing.rollNo || nextClassName !== existing.className || nextSection !== existing.section) {
      const duplicate = await prisma.student.findUnique({
        where: { rollNo_className_section: { rollNo: nextRollNo, className: nextClassName, section: nextSection } }
      });
      if (duplicate && duplicate.id !== existing.id) {
        throw new ValidationError("A student with this roll number already exists in that class/section", {
          rollNo: "Already in use for this class/section"
        });
      }
    }

    const student = await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        rollNo: nextRollNo,
        className: nextClassName,
        section: nextSection,
        ...(guardianName !== undefined ? { guardianName } : {}),
        ...(guardianPhone !== undefined ? { guardianPhone } : {})
      }
    });
    writeAuditLog({
      userId: req.user.id,
      action: "update",
      entityType: "Student",
      entityId: student.id,
      before: { name: existing.name, rollNo: existing.rollNo, className: existing.className, section: existing.section },
      after: { name: student.name, rollNo: student.rollNo, className: student.className, section: student.section }
    });
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

// Soft-delete: flip status to "archived" rather than removing the row —
// keeps fee/attendance history intact and lets an admin restore later.
export async function archive(req, res, next) {
  try {
    const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Student not found");

    const student = await prisma.student.update({
      where: { id: existing.id },
      data: { status: "archived" }
    });
    writeAuditLog({ userId: req.user.id, action: "archive", entityType: "Student", entityId: student.id });
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function restore(req, res, next) {
  try {
    const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Student not found");

    const student = await prisma.student.update({
      where: { id: existing.id },
      data: { status: "active" }
    });
    writeAuditLog({ userId: req.user.id, action: "restore", entityType: "Student", entityId: student.id });
    res.json({ student });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/export?className=&section=&status=  -> CSV
export async function exportCsv(req, res, next) {
  try {
    const { className, section, status = "active" } = req.query;
    const students = await prisma.student.findMany({
      where: {
        ...branchScope(req),
        ...(status !== "all" ? { status } : {}),
        ...(className ? { className } : {}),
        ...(section ? { section } : {})
      },
      orderBy: [{ className: "asc" }, { section: "asc" }, { name: "asc" }]
    });

    const header = "Name,Roll No,Class,Section,Guardian Name,Guardian Phone,Admission Date,Status\n";
    const rows = students
      .map((s) =>
        [
          csvEscape(s.name),
          csvEscape(s.rollNo),
          csvEscape(s.className),
          csvEscape(s.section),
          csvEscape(s.guardianName),
          csvEscape(s.guardianPhone),
          s.admissionDate.toISOString().slice(0, 10),
          s.status
        ].join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="students-export.csv"');
    res.send(header + rows + (rows ? "\n" : ""));
  } catch (err) {
    next(err);
  }
}

// POST /api/students/import — multipart file field "file", a CSV with
// header Name,Roll No,Class,Section,Guardian Name,Guardian Phone (case-
// insensitive, extra/reordered columns ignored). Row-by-row rather than a
// single bulk insert so one bad row (duplicate roll no, missing name)
// doesn't sink the whole file — each row either creates a student or adds
// an entry to `errors`, and the response reports both counts.
const IMPORT_COLUMNS = {
  name: ["name"],
  rollNo: ["roll no", "rollno", "roll_no"],
  className: ["class", "classname", "class name"],
  section: ["section"],
  guardianName: ["guardian name", "guardianname"],
  guardianPhone: ["guardian phone", "guardianphone"]
};

function mapImportRow(row, headerIndex) {
  const out = {};
  for (const [field, aliases] of Object.entries(IMPORT_COLUMNS)) {
    const idx = aliases.map((a) => headerIndex[a]).find((i) => i !== undefined);
    out[field] = idx !== undefined ? (row[idx] || "").trim() : "";
  }
  return out;
}

export async function importCsv(req, res, next) {
  try {
    if (!req.file) throw new ValidationError("A CSV file is required (field name: file)");

    const rows = parseCsv(req.file.buffer.toString("utf-8"));
    if (rows.length < 2) throw new ValidationError("CSV has no data rows");

    const headerIndex = {};
    rows[0].forEach((h, i) => {
      headerIndex[h.trim().toLowerCase()] = i;
    });

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      const rowNum = i + 1; // 1-based, matches what a spreadsheet app shows
      const raw = rows[i];
      if (raw.every((c) => !c || !c.trim())) continue; // skip blank lines

      const mapped = mapImportRow(raw, headerIndex);
      const { valid, errors: fieldErrors } = validateStudentInput(mapped);
      if (!valid) {
        skipped++;
        errors.push({ row: rowNum, message: Object.values(fieldErrors).join("; ") });
        continue;
      }

      const duplicate = await prisma.student.findUnique({
        where: {
          rollNo_className_section: {
            rollNo: mapped.rollNo,
            className: mapped.className,
            section: mapped.section
          }
        }
      });
      if (duplicate) {
        skipped++;
        errors.push({ row: rowNum, message: "Duplicate roll number for that class/section" });
        continue;
      }

      const student = await prisma.student.create({
        data: { ...mapped, name: mapped.name.trim(), branchId: req.branchId || null }
      });
      writeAuditLog({
        userId: req.user.id,
        action: "import",
        entityType: "Student",
        entityId: student.id,
        after: { name: student.name, rollNo: student.rollNo, className: student.className, section: student.section }
      });
      created++;
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    next(err);
  }
}
