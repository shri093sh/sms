import "dotenv/config";
import path from "node:path";

export const env = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  // Phase 15 — Google Sign-In. The same client ID is used by the frontend
  // (Google Identity Services button) and here to verify the ID token it
  // sends us. Login is disabled server-side (clear error) if unset.
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  // Where automated + manual backups are written. Local disk by default —
  // swap for an S3/GCS upload step later without touching the job's
  // scheduling logic (see jobs/backupJob.js).
  backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), "backups"),
  jwt: {
    // Dev fallbacks so `npm run dev` works without an .env file; always
    // set real secrets via .env (or your host's env vars) for anything
    // beyond local development.
    accessSecret: process.env.JWT_SECRET || "dev-access-secret-change-me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
  }
};

