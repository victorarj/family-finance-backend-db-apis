import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import { budgetFixture, TEST_MONTH } from "../../fixtures/planning.js";
import { expenseFixture, incomeFixture } from "../../fixtures/transactions.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";

describe("planning projection route", () => {
  let app;

  beforeAll(async function () {
    const environment = await ensureTestEnvironment();
    if (environment.skipReason) {
      this.skip(environment.skipReason);
    }
    app = await getTestApp();
  }, 120000);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await shutdownTestEnvironment();
  });

  it("returns expected projection fields and values", async () => {
    const { authHeader, bankAccountId } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 2000 }));
    await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ valor_total: 400, valor_mensal: 400, conta_bancaria_id: bankAccountId }));
    await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture({ valor_planejado: 500 }));

    const projection = await request(app)
      .get(`/planning/projection?mes=${TEST_MONTH}`)
      .set(authHeader);
    expect(projection.status).toBe(200);
    expect(projection.body).toEqual(
      expect.objectContaining({
        month: TEST_MONTH,
        income: 2000,
        expenses_logged: 400,
        fixed_expenses: 0,
        planned_variable: 500,
        projected_balance: 1500,
      }),
    );
  });
});
