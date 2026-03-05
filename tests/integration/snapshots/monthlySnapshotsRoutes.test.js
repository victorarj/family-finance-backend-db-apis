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

describe("monthly snapshots routes", () => {
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

  it("creates a snapshot and blocks duplicates", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 2000 }));
    await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ valor_total: 1000, valor_mensal: 1000 }));
    await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture({ valor_planejado: 300 }));

    const created = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });
    expect(created.status).toBe(201);
    expect(Number(created.body.saldo_projetado)).toBe(1700);

    const duplicate = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });
    expect(duplicate.status).toBe(409);
  });

  it("requires explicit confirmation on non-positive projection", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 1000 }));
    await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture({ valor_planejado: 1200 }));

    const blocked = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });
    expect(blocked.status).toBe(409);

    const confirmed = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH, confirm_negative: true });
    expect(confirmed.status).toBe(201);
    expect(Number(confirmed.body.saldo_projetado)).toBe(-200);
  });

  it("returns planned and actual values in snapshot details", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    await request(app).post("/income").set(authHeader).send(incomeFixture({ valor: 2500 }));
    await request(app)
      .post("/monthly-budgets")
      .set(authHeader)
      .send(budgetFixture({ valor_planejado: 500 }));

    const created = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });
    expect(created.status).toBe(201);

    await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ valor_total: 600, valor_mensal: 600 }));

    const details = await request(app)
      .get(`/monthly-snapshots/${created.body.id}/details`)
      .set(authHeader);
    expect(details.status).toBe(200);
    expect(details.body.planned_income).toBe(2500);
    expect(details.body.planned_expenses).toBe(500);
    expect(details.body.projected_balance).toBe(2000);
    expect(details.body.actual_income).toBe(2500);
    expect(details.body.actual_expenses).toBe(600);
    expect(details.body.planned_vs_actual_diff).toBe(-100);
  });
});
