import cron from "node-cron";
import { prisma } from "../config/db.js";

// Replaces the original app's `meshSweepOverdueEmi` (which only ran while
// some browser tab had the app open and won the mesh leader-election).
// Runs server-side on a fixed schedule regardless of any open client —
// single source of truth, no leader election needed.
//
// Schedule: every hour, on the hour. Cheap query (indexed on
// [status, dueDate] per schema.prisma) — fine to run this often even on a
// modest DB.
const SCHEDULE = "0 * * * *";

export function startOverdueSweep() {
  const task = cron.schedule(SCHEDULE, async () => {
    try {
      const result = await prisma.installment.updateMany({
        where: { status: "pending", dueDate: { lt: new Date() } },
        data: { status: "overdue" }
      });
      if (result.count > 0) {
        console.log(`[overdue-sweep] flipped ${result.count} installment(s) pending -> overdue`);
      }
    } catch (err) {
      console.error("[overdue-sweep] failed:", err);
    }
  });

  // Also run once at startup so a server that's been down doesn't leave
  // stale "pending" installments sitting past due until the next hour
  // mark.
  runOnce();

  return task;
}

async function runOnce() {
  try {
    const result = await prisma.installment.updateMany({
      where: { status: "pending", dueDate: { lt: new Date() } },
      data: { status: "overdue" }
    });
    if (result.count > 0) {
      console.log(`[overdue-sweep] startup sweep flipped ${result.count} installment(s) pending -> overdue`);
    }
  } catch (err) {
    console.error("[overdue-sweep] startup sweep failed:", err);
  }
}
