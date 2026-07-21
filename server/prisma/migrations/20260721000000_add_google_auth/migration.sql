-- Phase 15 — Google Sign-In
-- passwordHash becomes optional (Google-only accounts have none)
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- authProvider distinguishes local-password accounts from Google accounts
ALTER TABLE "users" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'local';
