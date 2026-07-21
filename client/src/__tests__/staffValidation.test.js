import { describe, it, expect } from "vitest";
import { validateStaffInput } from "../utils/staffValidation.js";

describe("validateStaffInput — create (partial: false)", () => {
  it("passes with all required fields present", () => {
    const { valid, errors } = validateStaffInput({
      name: "Kavya Nair",
      subject: "Mathematics",
      phone: "9876543210",
      email: "kavya@example.com"
    });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it("flags every missing required field", () => {
    const { valid, errors } = validateStaffInput({});
    expect(valid).toBe(false);
    expect(errors.name).toBeDefined();
    expect(errors.subject).toBeDefined();
  });

  it("rejects a name over 100 characters", () => {
    const { valid, errors } = validateStaffInput({ name: "a".repeat(101), subject: "Science" });
    expect(valid).toBe(false);
    expect(errors.name).toMatch(/100/);
  });

  it("rejects a malformed phone but accepts a valid one", () => {
    const bad = validateStaffInput({ name: "Kavya Nair", subject: "Mathematics", phone: "not-a-phone!!" });
    expect(bad.valid).toBe(false);
    expect(bad.errors.phone).toBeDefined();

    const good = validateStaffInput({ name: "Kavya Nair", subject: "Mathematics", phone: "+91 98765 43210" });
    expect(good.valid).toBe(true);
  });

  it("rejects a malformed email but accepts a valid one", () => {
    const bad = validateStaffInput({ name: "Kavya Nair", subject: "Mathematics", email: "not-an-email" });
    expect(bad.valid).toBe(false);
    expect(bad.errors.email).toBeDefined();

    const good = validateStaffInput({ name: "Kavya Nair", subject: "Mathematics", email: "kavya@example.com" });
    expect(good.valid).toBe(true);
  });

  it("phone and email are optional — omitting them is valid", () => {
    const { valid, errors } = validateStaffInput({ name: "Kavya Nair", subject: "Mathematics" });
    expect(valid).toBe(true);
    expect(errors.phone).toBeUndefined();
    expect(errors.email).toBeUndefined();
  });
});

describe("validateStaffInput — update (partial: true)", () => {
  it("does not flag fields that are simply absent from the patch", () => {
    const { valid, errors } = validateStaffInput({ name: "New Name" }, { partial: true });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it("still validates a field that IS present in the patch", () => {
    const { valid, errors } = validateStaffInput({ name: "   " }, { partial: true });
    expect(valid).toBe(false);
    expect(errors.name).toBeDefined();
  });
});
