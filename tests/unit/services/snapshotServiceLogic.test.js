import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, projectionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  projectionMock: vi.fn(),
}));

vi.mock("../../../backend/db.js", () => ({
  default: { query: queryMock },
}));
vi.mock("../../../backend/services/projectionService.js", () => ({
  getProjectionDataForMonth: projectionMock,
}));

import {
  computeSnapshotData,
  requiresNegativeConfirmation,
  snapshotExistsForMonth,
} from "../../../backend/services/snapshotService.js";

describe("snapshotService logic", () => {
  beforeEach(() => {
    queryMock.mockReset();
    projectionMock.mockReset();
  });

  it("maps projection fields into snapshot totals", async () => {
    projectionMock.mockResolvedValueOnce({
      totalIncome: 2000,
      fixedExpenses: 1000,
      plannedVariable: 300,
      projectedBalance: 700,
    });
    const result = await computeSnapshotData({ id: 1 }, "2026-03");
    expect(result).toEqual({
      totalReceitas: 2000,
      totalFixas: 1000,
      totalVariaveis: 300,
      saldoProjetado: 700,
    });
  });

  it("requires confirmation when projected balance is non-positive", () => {
    expect(requiresNegativeConfirmation(-1, false)).toBe(true);
    expect(requiresNegativeConfirmation(0, false)).toBe(true);
    expect(requiresNegativeConfirmation(-1, true)).toBe(false);
    expect(requiresNegativeConfirmation(10, false)).toBe(false);
  });

  it("detects duplicate snapshot month", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
    await expect(snapshotExistsForMonth(1, "2026-03")).resolves.toBe(true);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(snapshotExistsForMonth(1, "2026-04")).resolves.toBe(false);
  });
});
