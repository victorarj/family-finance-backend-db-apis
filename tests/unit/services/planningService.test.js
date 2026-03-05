import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("../../../backend/db.js", () => ({
  default: { query: queryMock },
}));

import {
  assertMonthIsOpen,
  deriveMonthStatus,
  getLockedMonthsMap,
  monthFromDate,
} from "../../../backend/services/planningService.js";

describe("planningService", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("monthFromDate handles strings, dates, and invalid values", () => {
    expect(monthFromDate("2026-03-10")).toBe("2026-03");
    expect(monthFromDate(new Date("2026-03-10"))).toBe("2026-03");
    expect(monthFromDate("x")).toBeNull();
    expect(monthFromDate(null)).toBeNull();
  });

  it("assertMonthIsOpen throws 409 when snapshot exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
    await expect(assertMonthIsOpen(1, "2026-03")).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("assertMonthIsOpen passes when month is open", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(assertMonthIsOpen(1, "2026-03")).resolves.toBeUndefined();
  });

  it("deriveMonthStatus follows NOT_STARTED -> IN_PROGRESS -> COMPLETED priorities", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // snapshot
      .mockResolvedValueOnce({ rows: [] }) // budgets
      .mockResolvedValueOnce({ rows: [] }); // recurring
    await expect(deriveMonthStatus(1, "2026-03")).resolves.toBe("NOT_STARTED");

    queryMock
      .mockResolvedValueOnce({ rows: [] }) // snapshot
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // budgets
    await expect(deriveMonthStatus(1, "2026-03")).resolves.toBe("IN_PROGRESS");

    queryMock.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // snapshot
    await expect(deriveMonthStatus(1, "2026-03")).resolves.toBe("COMPLETED");
  });

  it("getLockedMonthsMap returns map with locked months", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ mes: "2026-03" }, { mes: "2026-04" }] });
    const map = await getLockedMonthsMap(1, ["2026-03", "2026-04", "2026-05"]);
    expect(map.get("2026-03")).toBe(true);
    expect(map.get("2026-04")).toBe(true);
    expect(map.get("2026-05")).toBeUndefined();
  });
});
