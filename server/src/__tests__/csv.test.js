import { describe, it, expect } from "vitest";
import { csvEscape, parseCsv } from "../utils/csv.js";

describe("csvEscape", () => {
  it("leaves plain values untouched", () => {
    expect(csvEscape("Asha Rao")).toBe("Asha Rao");
    expect(csvEscape(42)).toBe("42");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    expect(csvEscape("Rao, Asha")).toBe('"Rao, Asha"');
    expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null/undefined as an empty field", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("parseCsv", () => {
  it("parses a simple header + rows", () => {
    const rows = parseCsv("Name,Roll No\nAsha,12\nRavi,13\n");
    expect(rows).toEqual([
      ["Name", "Roll No"],
      ["Asha", "12"],
      ["Ravi", "13"]
    ]);
  });

  it("handles quoted fields with embedded commas and escaped quotes", () => {
    const rows = parseCsv('Name,Note\n"Rao, Asha","Said ""hi"""\n');
    expect(rows).toEqual([
      ["Name", "Note"],
      ["Rao, Asha", 'Said "hi"']
    ]);
  });

  it("handles a quoted field containing a newline", () => {
    const rows = parseCsv('Name,Note\nRavi,"line1\nline2"\n');
    expect(rows).toEqual([
      ["Name", "Note"],
      ["Ravi", "line1\nline2"]
    ]);
  });

  it("handles a file with no trailing newline", () => {
    const rows = parseCsv("Name,Roll No\nAsha,12");
    expect(rows).toEqual([
      ["Name", "Roll No"],
      ["Asha", "12"]
    ]);
  });

  it("skips fully blank lines", () => {
    const rows = parseCsv("Name,Roll No\nAsha,12\n\nRavi,13\n");
    expect(rows).toEqual([
      ["Name", "Roll No"],
      ["Asha", "12"],
      ["Ravi", "13"]
    ]);
  });
});
