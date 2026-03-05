import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("../../../backend/db.js", () => ({
  default: { query: queryMock },
}));

import { getProjectionDataForMonth } from "../../../backend/services/projectionService.js";

describe("projectionService", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("calculates projection with logged + recurring + budgets", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: "2000" }] }) // income
      .mockResolvedValueOnce({ rows: [{ total: "400" }] }) // expenses
      .mockResolvedValueOnce({ rows: [{ total: "0" }] }) // recurring income
      .mockResolvedValueOnce({ rows: [{ total: "0" }] }) // recurring expense
      .mockResolvedValueOnce({ rows: [{ total: "500" }] }); // budgets

    const result = await getProjectionDataForMonth(
      { id: 1, email: "test@example.com" },
      "2026-03",
    );
    expect(result.totalIncome).toBe(2000);
    expect(result.totalExpenses).toBe(400);
    expect(result.projectedBalance).toBe(1100);
  });

  it("includes recurring income and recurring expenses", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: "1000" }] })
      .mockResolvedValueOnce({ rows: [{ total: "300" }] })
      .mockResolvedValueOnce({ rows: [{ total: "500" }] })
      .mockResolvedValueOnce({ rows: [{ total: "200" }] })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] });

    const result = await getProjectionDataForMonth(
      { id: 2, email: "test@example.com" },
      "2026-03",
    );
    expect(result.totalIncome).toBe(1500);
    expect(result.totalExpenses).toBe(500);
    expect(result.projectedBalance).toBe(1000);
  });

  it("falls back to zero when aggregates are null", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: null }] })
      .mockResolvedValueOnce({ rows: [{ total: null }] })
      .mockResolvedValueOnce({ rows: [{ total: null }] })
      .mockResolvedValueOnce({ rows: [{ total: null }] })
      .mockResolvedValueOnce({ rows: [{ total: null }] });

    const result = await getProjectionDataForMonth(
      { id: 3, email: "test@example.com" },
      "2026-03",
    );
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.plannedVariable).toBe(0);
    expect(result.projectedBalance).toBe(0);
  });
});
