import { describe, it, expect, vi } from "vitest";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { signAccessToken } from "../utils/jwt.js";

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

describe("requireAuth", () => {
  it("calls next() with a populated req.user on a valid Bearer token", () => {
    const token = signAccessToken({ id: "u1", role: "teacher", email: "t@example.com" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = vi.fn();

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(); // no error arg
    expect(req.user).toEqual({ id: "u1", role: "teacher", email: "t@example.com", branchId: null });
    expect(req.branchId).toBeNull();
  });

  it("resolves req.branchId from the token for a non-admin", () => {
    const token = signAccessToken({ id: "u1", role: "teacher", email: "t@example.com", branchId: "b1" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = vi.fn();

    requireAuth(req, mockRes(), next);

    expect(req.branchId).toBe("b1");
  });

  it("lets an admin override req.branchId via the X-Branch-Id header", () => {
    const token = signAccessToken({ id: "u1", role: "admin", email: "a@example.com", branchId: "b1" });
    const req = { headers: { authorization: `Bearer ${token}`, "x-branch-id": "b2" } };
    const next = vi.fn();

    requireAuth(req, mockRes(), next);

    expect(req.branchId).toBe("b2");
  });

  it("ignores the X-Branch-Id header override for a non-admin", () => {
    const token = signAccessToken({ id: "u1", role: "teacher", email: "t@example.com", branchId: "b1" });
    const req = { headers: { authorization: `Bearer ${token}`, "x-branch-id": "b2" } };
    const next = vi.fn();

    requireAuth(req, mockRes(), next);

    expect(req.branchId).toBe("b1");
  });

  it("calls next(err) with a 401-style AuthError when the header is missing", () => {
    const req = { headers: {} };
    const next = vi.fn();

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(401);
  });

  it("calls next(err) when the token is invalid", () => {
    const req = { headers: { authorization: "Bearer not-a-real-token" } };
    const next = vi.fn();

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});

describe("requireRole", () => {
  it("allows a matching role through", () => {
    const req = { user: { id: "u1", role: "admin" } };
    const next = vi.fn();

    requireRole("admin", "accountant")(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a non-matching role with a 403-style ForbiddenError", () => {
    const req = { user: { id: "u2", role: "teacher" } };
    const next = vi.fn();

    requireRole("admin", "accountant")(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it("rejects when req.user is missing (requireAuth didn't run first)", () => {
    const req = {};
    const next = vi.fn();

    requireRole("admin")(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});
