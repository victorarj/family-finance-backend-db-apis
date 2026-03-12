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

describe("dashboard route", () => {
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

  it("keeps projection aligned with planning projection", async () => {
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

    const planningProjection = await request(app)
      .get(`/planning/projection?mes=${TEST_MONTH}`)
      .set(authHeader);
    const dashboard = await request(app)
      .get(`/dashboard?mes=${TEST_MONTH}`)
      .set(authHeader);

    expect(planningProjection.status).toBe(200);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.projection).toBe(planningProjection.body.projected_balance);
    expect(dashboard.body.balance).toBe(1600);
    expect(dashboard.body.actual_income).toBe(2000);
    expect(dashboard.body.actual_expenses).toBe(400);
    expect(dashboard.body.planned_income).toBeNull();
    expect(dashboard.body.planned_expenses).toBeNull();
    expect(dashboard.body.planned_vs_actual_diff).toBeNull();
  });
});
