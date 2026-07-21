import { describe, it, expect } from "vitest";
import { branchScope } from "../utils/branchScope.js";

describe("branchScope", () => {
  it("returns an empty filter when req.branchId is not set", () => {
    expect(branchScope({ branchId: null })).toEqual({});
    expect(branchScope({})).toEqual({});
  });

  it("returns a branchId filter when req.branchId is set", () => {
    expect(branchScope({ branchId: "b1" })).toEqual({ branchId: "b1" });
  });
});
