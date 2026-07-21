import { describe, it, expect } from "vitest";
import { validateStudentInput } from "../utils/studentValidation.js";

describe("validateStudentInput — create (partial: false)", () => {
  it("passes with all required fields present", () => {
    const { valid, errors } = validateStudentInput({
      name: "Asha Rao",
      rollNo: "12A-04",
      className: "8",
      section: "A",
      guardianPhone: "9876543210"
    });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it("flags every missing required field", () => {
    const { valid, errors } = validateStudentInput({});
    expect(valid).toBe(false);
    expect(errors.name).toBeDefined();
    expect(errors.rollNo).toBeDefined();
    expect(errors.className).toBeDefined();
    expect(errors.section).toBeDefined();
  });

  it("rejects a name over 100 characters", () => {
    const { valid, errors } = validateStudentInput({
      name: "a".repeat(101),
      rollNo: "1",
      className: "8",
      section: "A"
    });
    expect(valid).toBe(false);
    expect(errors.name).toMatch(/100/);
  });

  it("rejects a malformed guardian phone but accepts a valid one", () => {
    const bad = validateStudentInput({
      name: "Asha Rao",
      rollNo: "1",
      className: "8",
      section: "A",
      guardianPhone: "not-a-phone!!"
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.guardianPhone).toBeDefined();

    const good = validateStudentInput({
      name: "Asha Rao",
      rollNo: "1",
      className: "8",
      section: "A",
      guardianPhone: "+91 98765 43210"
    });
    expect(good.valid).toBe(true);
  });

  it("guardian phone is optional — omitting it is valid", () => {
    const { valid, errors } = validateStudentInput({
      name: "Asha Rao",
      rollNo: "1",
      className: "8",
      section: "A"
    });
    expect(valid).toBe(true);
    expect(errors.guardianPhone).toBeUndefined();
  });
});

describe("validateStudentInput — update (partial: true)", () => {
  it("does not flag fields that are simply absent from the patch", () => {
    const { valid, errors } = validateStudentInput({ name: "New Name" }, { partial: true });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it("still validates a field that IS present in the patch", () => {
    const { valid, errors } = validateStudentInput({ name: "   " }, { partial: true });
    expect(valid).toBe(false);
    expect(errors.name).toBeDefined();
  });
});
