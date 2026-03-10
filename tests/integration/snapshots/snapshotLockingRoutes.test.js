import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import { TEST_MONTH } from "../../fixtures/planning.js";
import { expenseFixture, incomeFixture } from "../../fixtures/transactions.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";

describe("snapshot locking routes", () => {
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

  it("blocks expense and income updates after snapshot lock", async () => {
    const { authHeader, bankAccountId } = await createAuthenticatedUser(app);
    const income = await request(app).post("/income").set(authHeader).send(incomeFixture());
    const expense = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ conta_bancaria_id: bankAccountId }));

    await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });

    const updateExpense = await request(app)
      .put(`/expenses/${expense.body.id}`)
      .set(authHeader)
      .send(
        expenseFixture({
          nome: expense.body.nome,
          valor_total: 1200,
          valor_mensal: 1200,
          conta_bancaria_id: bankAccountId,
        }),
      );
    expect(updateExpense.status).toBe(409);

    const updateIncome = await request(app)
      .put(`/income/${income.body.id}`)
      .set(authHeader)
      .send(incomeFixture({ nome: income.body.nome, valor: 2500 }));
    expect(updateIncome.status).toBe(409);

    const createExpenseAfterSnapshot = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ nome: `Post Snapshot Expense ${Date.now()}`, conta_bancaria_id: bankAccountId }));
    expect(createExpenseAfterSnapshot.status).toBe(201);

    const createIncomeAfterSnapshot = await request(app)
      .post("/income")
      .set(authHeader)
      .send(incomeFixture({ nome: `Post Snapshot Income ${Date.now()}` }));
    expect(createIncomeAfterSnapshot.status).toBe(201);
  });

  it("returns locked=true in list endpoints for locked month", async () => {
    const { authHeader, bankAccountId } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture());
    await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ conta_bancaria_id: bankAccountId }));
    await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });

    const expenses = await request(app).get("/expenses").set(authHeader);
    const incomes = await request(app).get("/income").set(authHeader);
    expect(expenses.status).toBe(200);
    expect(incomes.status).toBe(200);
    expect(expenses.body.every((item) => item.locked === true)).toBe(true);
    expect(incomes.body.every((item) => item.locked === true)).toBe(true);
  });
});
