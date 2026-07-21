import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { runBackup } from "../jobs/backupJob.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export async function list(req, res, next) {
  try {
    const backups = await prisma.backupLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ backups });
  } catch (err) {
    next(err);
  }
}

// POST /api/backups/run — admin-triggered snapshot, on top of whatever
// the scheduler in jobs/backupJob.js does automatically.
export async function runNow(req, res, next) {
  try {
    const log = await runBackup();
    if (log.status === "failed") {
      throw new ValidationError(
        "Backup failed — check server logs. Common causes: pg_dump isn't installed/on PATH, or DATABASE_URL is unreachable."
      );
    }
    res.status(201).json({ backup: log });
  } catch (err) {
    next(err);
  }
}

export async function download(req, res, next) {
  try {
    const log = await prisma.backupLog.findUnique({ where: { id: req.params.id } });
    if (!log || !log.fileUrl) throw new NotFoundError("Backup not found");

    const filePath = path.join(env.backupDir, log.fileUrl);
    if (!fs.existsSync(filePath)) throw new NotFoundError("Backup file no longer exists on disk");

    res.download(filePath, log.fileUrl);
  } catch (err) {
    next(err);
  }
}
