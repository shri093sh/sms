import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock both of overdueSweep.js's dependencies so this test runs without a
// real Postgres connection (Prisma's query engine can't even be generated
// in this sandbox — see docs/PROGRESS.md) and without an actual cron
// scheduler ticking during the test run.
const updateManyMock = vi.fn();
vi.mock("../config/db.js", () => ({
  prisma: { installment: { updateMany: (...args) => updateManyMock(...args) } }
}));

const scheduleMock = vi.fn();
vi.mock("node-cron", () => ({
  default: { schedule: (...args) => scheduleMock(...args) }
}));

const { startOverdueSweep } = await import("../jobs/overdueSweep.js");

beforeEach(() => {
  updateManyMock.mockReset();
  scheduleMock.mockReset();
});

describe("overdueSweep", () => {
  it("registers an hourly cron schedule", () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    startOverdueSweep();
    expect(scheduleMock).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
  });

  it("runs an immediate sweep at startup, flipping pending->overdue on the right filter", async () => {
    updateManyMock.mockResolvedValue({ count: 3 });
    startOverdueSweep();

    // The startup sweep is fire-and-forget (not awaited by startOverdueSweep
    // itself), so let pending microtasks flush.
    await new Promise((r) => setTimeout(r, 0));

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { status: "pending", dueDate: { lt: expect.any(Date) } },
      data: { status: "overdue" }
    });
  });

  it("the scheduled callback runs the same query when invoked", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    startOverdueSweep();

    const scheduledCallback = scheduleMock.mock.calls[0][1];
    updateManyMock.mockClear();
    await scheduledCallback();

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { status: "pending", dueDate: { lt: expect.any(Date) } },
      data: { status: "overdue" }
    });
  });

  it("does not throw if the DB call rejects", async () => {
    updateManyMock.mockRejectedValue(new Error("connection lost"));
    expect(() => startOverdueSweep()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
