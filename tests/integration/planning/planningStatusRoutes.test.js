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

describe("planning status route", () => {
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

  it("transitions NOT_STARTED -> IN_PROGRESS -> COMPLETED", async () => {
    const { authHeader } = await createAuthenticatedUser(app);

    const start = await request(app)
      .get(`/planning/status?mes=${TEST_MONTH}`)
      .set(authHeader);
    expect(start.status).toBe(200);
    expect(start.body.status).toBe("NOT_STARTED");

    await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture());
    const inProgress = await request(app)
      .get(`/planning/status?mes=${TEST_MONTH}`)
      .set(authHeader);
    expect(inProgress.body.status).toBe("IN_PROGRESS");

    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 500 }));
    await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });
    const completed = await request(app)
      .get(`/planning/status?mes=${TEST_MONTH}`)
      .set(authHeader);
    expect(completed.body.status).toBe("COMPLETED");
  });
});
