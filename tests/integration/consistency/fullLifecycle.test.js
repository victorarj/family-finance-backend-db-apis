import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";
import { budgetFixture, TEST_MONTH } from "../../fixtures/planning.js";
import { expenseFixture, incomeFixture } from "../../fixtures/transactions.js";

describe("full financial lifecycle", () => {
  let app;

  beforeAll(async () => {
    await ensureTestEnvironment();
    app = await getTestApp();
  }, 120000);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await shutdownTestEnvironment();
  });

  it("create user -> transactions -> budget -> projection -> snapshot -> lock -> edit rejected", async () => {
    const { authHeader } = await createAuthenticatedUser(app);

    const income = await request(app)
      .post("/income")
      .set(authHeader)
      .send(incomeFixture());
    expect(income.status).toBe(201);
    expect(income.body.locked).toBe(false);

    const expense = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture());
    expect(expense.status).toBe(201);
    expect(expense.body.locked).toBe(false);
    const expenseId = expense.body.id;

    const budget = await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture());
    expect(budget.status).toBe(201);

    const projection = await request(app)
      .get(`/planning/projection?mes=${TEST_MONTH}`)
      .set(authHeader);
    expect(projection.status).toBe(200);
    expect(projection.body).toEqual(
      expect.objectContaining({
        month: TEST_MONTH,
        income: 2000,
        expenses_logged: 1000,
        fixed_expenses: 0,
        planned_variable: 300,
        projected_balance: 1700,
      }),
    );

    const snapshot = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });
    expect(snapshot.status).toBe(201);
    expect(Number(snapshot.body.total_receitas)).toBe(2000);
    expect(Number(snapshot.body.total_fixas)).toBe(0);
    expect(Number(snapshot.body.total_variaveis)).toBe(300);
    expect(Number(snapshot.body.saldo_projetado)).toBe(1700);

    const status = await request(app)
      .get(`/planning/status?mes=${TEST_MONTH}`)
      .set(authHeader);
    expect(status.status).toBe(200);
    expect(status.body.status).toBe("COMPLETED");

    const lockedEdit = await request(app)
      .put(`/expenses/${expenseId}`)
      .set(authHeader)
      .send(expenseFixture({ nome: "Updated locked expense" }));
    expect(lockedEdit.status).toBe(409);
    expect(String(lockedEdit.body.error || "")).toMatch(/closed|snapshot|month/i);
  });
});
