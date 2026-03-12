import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import { budgetFixture, TEST_MONTH } from "../../fixtures/planning.js";
import { incomeFixture } from "../../fixtures/transactions.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";

describe("monthly budgets routes", () => {
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

  it("creates budget and blocks mutations when month is locked", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 2000 }));
    const created = await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture({ valor_planejado: 500 }));
    expect(created.status).toBe(201);

    await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });

    const update = await request(app)
      .put(`/monthly-budgets/${created.body.id}`)
      .set(authHeader)
      .send({ valor_planejado: 900 });
    expect(update.status).toBe(409);

    const deletion = await request(app)
      .delete(`/monthly-budgets/${created.body.id}`)
      .set(authHeader);
    expect(deletion.status).toBe(409);
  });
});
