import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import cron from "node-cron";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";

const execFileAsync = promisify(execFile);

// Direct replacement for the original app's `checkDailyBackupTrigger`,
// which only ran while some browser tab was open. This writes a real
// pg_dump snapshot to disk (env.backupDir) server-side, on schedule,
// regardless of any open client — same "single source of truth" shift as
// the Phase 7 overdue-installment sweep.
export async function runBackup() {
  await fs.mkdir(env.backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${stamp}.sql`;
  const filePath = path.join(env.backupDir, fileName);

  try {
    if (!env.databaseUrl) throw new Error("DATABASE_URL is not set");
    // pg_dump accepts a full connection URI as --dbname, so no separate
    // host/user/password flags are needed here.
    await execFileAsync("pg_dump", [`--dbname=${env.databaseUrl}`, "--format=plain", "-f", filePath]);
    const log = await prisma.backupLog.create({ data: { fileUrl: fileName, status: "success" } });
    console.log(`[backup] wrote ${fileName}`);
    return log;
  } catch (err) {
    console.error("[backup] failed:", err.message);
    // Still write a log row on failure — Settings > Backups should show
    // failed attempts, not just silently have nothing happen.
    const log = await prisma.backupLog.create({ data: { fileUrl: null, status: "failed" } });
    return log;
  }
}

// Checked once a minute rather than dynamically rebuilding a cron
// expression every time Settings.backupTime changes in the UI — simpler,
// and a once-a-minute Settings read is negligible load. `lastRunDate`
// prevents firing twice inside the same HH:MM window.
let lastRunDate = null;

export function startBackupScheduler() {
  const task = cron.schedule("* * * * *", async () => {
    try {
      const settings = await prisma.settings.findFirst();
      if (!settings?.backupEnabled) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayKey = now.toISOString().slice(0, 10);

      if (settings.backupTime === currentTime && lastRunDate !== todayKey) {
        lastRunDate = todayKey;
        await runBackup();
      }
    } catch (err) {
      console.error("[backup-scheduler] check failed:", err);
    }
  });
  return task;
}
