import { describe, it, expect } from "vitest";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt.js";

const demoUser = { id: "u1", role: "admin", email: "admin@example.com" };

describe("jwt utils", () => {
  it("signs and verifies an access token round-trip", () => {
    const token = signAccessToken(demoUser);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(demoUser.id);
    expect(payload.role).toBe(demoUser.role);
    expect(payload.email).toBe(demoUser.email);
  });

  it("signs and verifies a refresh token round-trip", () => {
    const token = signRefreshToken(demoUser);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(demoUser.id);
    // Refresh tokens intentionally omit role/email — access token is
    // re-derived server-side from the DB on refresh, not trusted from
    // the refresh token's own payload.
    expect(payload.role).toBeUndefined();
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken(demoUser);
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("rejects an access token verified as a refresh token (different secrets)", () => {
    const token = signAccessToken(demoUser);
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});
