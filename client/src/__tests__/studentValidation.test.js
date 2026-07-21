import { describe, it, expect } from "vitest";
import { validateStudentInput } from "../utils/studentValidation.js";

// This file intentionally mirrors server/src/__tests__/studentValidation.test.js.
// The two validation modules are hand-synced (no shared workspace yet — see
// both files' header comments), so running the same cases against both
// catches drift if one gets updated without the other.
describe("validateStudentInput (client copy) — create", () => {
  it("passes with all required fields present", () => {
    const { valid, errors } = validateStudentInput({
      name: "Asha Rao",
      rollNo: "12A-04",
      className: "8",
      section: "A"
    });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });

  it("flags missing required fields", () => {
    const { valid, errors } = validateStudentInput({});
    expect(valid).toBe(false);
    expect(errors.name).toBeDefined();
    expect(errors.rollNo).toBeDefined();
    expect(errors.className).toBeDefined();
    expect(errors.section).toBeDefined();
  });

  it("rejects a malformed guardian phone", () => {
    const { valid, errors } = validateStudentInput({
      name: "Asha Rao",
      rollNo: "1",
      className: "8",
      section: "A",
      guardianPhone: "abc"
    });
    expect(valid).toBe(false);
    expect(errors.guardianPhone).toBeDefined();
  });
});

describe("validateStudentInput (client copy) — update", () => {
  it("only validates fields present in a partial patch", () => {
    const { valid, errors } = validateStudentInput({ section: "B" }, { partial: true });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });
});
