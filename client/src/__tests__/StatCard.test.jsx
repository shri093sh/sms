import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "../components/StatCard.jsx";

describe("StatCard", () => {
  it("renders the label and value when not loading", () => {
    render(<StatCard label="Total students" value={128} />);
    expect(screen.getByText("Total students")).toBeTruthy();
    expect(screen.getByText("128")).toBeTruthy();
  });

  it("shows a placeholder instead of the value while loading", () => {
    render(<StatCard label="Total students" value={128} loading />);
    expect(screen.getByText("Total students")).toBeTruthy();
    expect(screen.queryByText("128")).toBeNull();
  });

  it("renders the optional hint when provided", () => {
    render(<StatCard label="Today's attendance" value="92%" hint="45 marked today" />);
    expect(screen.getByText("45 marked today")).toBeTruthy();
  });
});
