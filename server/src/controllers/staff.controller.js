import { prisma } from "../config/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { validateStaffInput } from "../utils/staffValidation.js";
import { branchScope } from "../utils/branchScope.js";
import { writeAuditLog } from "../utils/audit.js";
import { csvEscape, parseCsv } from "../utils/csv.js";

const SORTABLE_FIELDS = new Set(["name", "subject", "joinDate"]);

export async function list(req, res, next) {
  try {
    const { q, status = "active", sort = "name", dir = "asc" } = req.query;

    const sortField = SORTABLE_FIELDS.has(sort) ? sort : "name";
    const sortDir = dir === "desc" ? "desc" : "asc";

    const where = {
      ...branchScope(req),
      ...(status !== "all" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { subject: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const staff = await prisma.staff.findMany({ where, orderBy: { [sortField]: sortDir } });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!staff) throw new NotFoundError("Staff member not found");
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, subject, phone, email } = req.body || {};
    const { valid, errors } = validateStaffInput(req.body || {});
    if (!valid) throw new ValidationError("Invalid staff data", errors);

    const staff = await prisma.staff.create({
      data: { name: name.trim(), subject: subject.trim(), phone, email, branchId: req.branchId || null }
    });
    writeAuditLog({
      userId: req.user.id,
      action: "create",
      entityType: "Staff",
      entityId: staff.id,
      after: { name: staff.name, subject: staff.subject }
    });
    res.status(201).json({ staff });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Staff member not found");

    const { valid, errors } = validateStaffInput(req.body || {}, { partial: true });
    if (!valid) throw new ValidationError("Invalid staff data", errors);

    const { name, subject, phone, email } = req.body || {};

    const staff = await prisma.staff.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(subject !== undefined ? { subject: subject.trim() } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {})
      }
    });
    writeAuditLog({
      userId: req.user.id,
      action: "update",
      entityType: "Staff",
      entityId: staff.id,
      before: { name: existing.name, subject: existing.subject },
      after: { name: staff.name, subject: staff.subject }
    });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

// Soft-delete: flip status to "archived" rather than removing the row —
// keeps timetable/payroll history intact and lets an admin restore later.
export async function archive(req, res, next) {
  try {
    const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Staff member not found");

    const staff = await prisma.staff.update({ where: { id: existing.id }, data: { status: "archived" } });
    writeAuditLog({ userId: req.user.id, action: "archive", entityType: "Staff", entityId: staff.id });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

export async function restore(req, res, next) {
  try {
    const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Staff member not found");

    const staff = await prisma.staff.update({ where: { id: existing.id }, data: { status: "active" } });
    writeAuditLog({ userId: req.user.id, action: "restore", entityType: "Staff", entityId: staff.id });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

// GET /api/staff/export?status=  -> CSV
export async function exportCsv(req, res, next) {
  try {
    const { status = "active" } = req.query;
    const staff = await prisma.staff.findMany({
      where: { ...branchScope(req), ...(status !== "all" ? { status } : {}) },
      orderBy: { name: "asc" }
    });

    const header = "Name,Subject,Phone,Email,Join Date,Status\n";
    const rows = staff
      .map((s) =>
        [
          csvEscape(s.name),
          csvEscape(s.subject),
          csvEscape(s.phone),
          csvEscape(s.email),
          s.joinDate.toISOString().slice(0, 10),
          s.status
        ].join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="staff-export.csv"');
    res.send(header + rows + (rows ? "\n" : ""));
  } catch (err) {
    next(err);
  }
}

// POST /api/staff/import — multipart file field "file", CSV with header
// Name,Subject,Phone,Email (case-insensitive, extra/reordered columns
// ignored). Same row-by-row, don't-sink-the-file approach as the
// students importer.
const IMPORT_COLUMNS = {
  name: ["name"],
  subject: ["subject"],
  phone: ["phone"],
  email: ["email"]
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
      const rowNum = i + 1;
      const raw = rows[i];
      if (raw.every((c) => !c || !c.trim())) continue;

      const mapped = mapImportRow(raw, headerIndex);
      const { valid, errors: fieldErrors } = validateStaffInput(mapped);
      if (!valid) {
        skipped++;
        errors.push({ row: rowNum, message: Object.values(fieldErrors).join("; ") });
        continue;
      }

      const staff = await prisma.staff.create({
        data: {
          name: mapped.name.trim(),
          subject: mapped.subject.trim(),
          phone: mapped.phone || null,
          email: mapped.email || null,
          branchId: req.branchId || null
        }
      });
      writeAuditLog({
        userId: req.user.id,
        action: "import",
        entityType: "Staff",
        entityId: staff.id,
        after: { name: staff.name, subject: staff.subject }
      });
      created++;
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    next(err);
  }
}
