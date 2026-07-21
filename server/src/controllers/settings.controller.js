import { prisma } from "../config/db.js";
import { ValidationError } from "../utils/errors.js";

// Settings is a single-row table (Phase 2's schema has no natural
// per-school key yet — multi-branch is Phase 13). getOrCreate keeps every
// caller simple: there's always exactly one row to read/update.
async function getOrCreateSettings() {
  const existing = await prisma.settings.findFirst();
  if (existing) return existing;
  return prisma.settings.create({ data: {} });
}

export async function get(req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { orgName, orgLogoUrl, backupEnabled, backupTime } = req.body || {};

    if (orgName !== undefined && !String(orgName).trim()) {
      throw new ValidationError("orgName can't be blank", { orgName: "Required" });
    }
    if (backupTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(backupTime)) {
      throw new ValidationError("backupTime must be in HH:MM (24h) format", { backupTime: "Use HH:MM, e.g. 02:00" });
    }
    if (backupEnabled !== undefined && typeof backupEnabled !== "boolean") {
      throw new ValidationError("backupEnabled must be true or false", { backupEnabled: "Must be a boolean" });
    }

    const existing = await getOrCreateSettings();
    const settings = await prisma.settings.update({
      where: { id: existing.id },
      data: {
        ...(orgName !== undefined ? { orgName: String(orgName).trim() } : {}),
        ...(orgLogoUrl !== undefined ? { orgLogoUrl: orgLogoUrl || null } : {}),
        ...(backupEnabled !== undefined ? { backupEnabled } : {}),
        ...(backupTime !== undefined ? { backupTime } : {})
      }
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}
