import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { AuthError, ValidationError } from "../utils/errors.js";
import { env } from "../config/env.js";

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

const REFRESH_COOKIE = "prerana_refresh";
const VALID_ROLES = ["admin", "teacher", "accountant"];

const refreshCookieOptions = (req) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days — keep in sync with JWT_REFRESH_EXPIRES_IN
});

function toPublicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Admin-only (see auth.routes.js) — this is how new staff accounts get
// created; there is no public self-registration in a school SMS.
export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      throw new ValidationError("name, email and password are required");
    }
    if (password.length < 8) {
      throw new ValidationError("password must be at least 8 characters");
    }
    if (role && !VALID_ROLES.includes(role)) {
      throw new ValidationError(`role must be one of: ${VALID_ROLES.join(", ")}`);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ValidationError("An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: role || "teacher" }
    });

    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ValidationError("email and password are required");

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message whether the email doesn't exist or the password is
    // wrong, so login can't be used to enumerate valid accounts.
    if (!user) throw new AuthError("Invalid email or password");

    if (!user.passwordHash) {
      throw new AuthError("This account signs in with Google. Use the Google sign-in button below.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AuthError("Invalid email or password");

    // Deactivated accounts (Settings > Users, Phase 9) get a distinct
    // message — this isn't a credentials problem, so there's no
    // enumeration risk in being specific here.
    if (!user.isActive) throw new AuthError("This account has been deactivated. Contact an admin.");

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(req));
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google — body: { credential } (the ID token Google
// Identity Services hands the frontend after a successful sign-in).
// First-time sign-in auto-creates an account (role defaults to
// "teacher", same as self-registration would if it existed) rather than
// requiring an admin to pre-provision every Google user — an admin can
// still adjust the role afterwards from Settings > Users. An existing
// local-password account with a matching email is treated as the same
// person and simply gets a session issued, no separate linking step.
export async function googleLogin(req, res, next) {
  try {
    if (!googleClient) {
      throw new AuthError("Google sign-in isn't configured on this server");
    }

    const { credential } = req.body || {};
    if (!credential) throw new ValidationError("credential is required");

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw new AuthError("Invalid Google sign-in token");
    }

    if (!payload?.email) throw new AuthError("Google account has no email");
    if (!payload.email_verified) throw new AuthError("Google email is not verified");

    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email,
          email: payload.email,
          passwordHash: null,
          authProvider: "google",
          role: "teacher"
        }
      });
    }

    if (!user.isActive) throw new AuthError("This account has been deactivated. Contact an admin.");

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(req));
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new AuthError("No refresh token");

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AuthError("Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new AuthError("User no longer exists");
    // Catches an admin deactivating this user mid-session — the access
    // token they're already holding still works until it expires (max
    // 15m default), but the next refresh cuts them off instead of
    // silently renewing.
    if (!user.isActive) throw new AuthError("This account has been deactivated. Contact an admin.");

    const accessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    res.cookie(REFRESH_COOKIE, newRefreshToken, refreshCookieOptions(req));
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).send();
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AuthError("User no longer exists");
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
