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

  it("keeps projection aligned with planning projection", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 2000 }));
    await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ valor_total: 400, valor_mensal: 400 }));
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
  });
});
