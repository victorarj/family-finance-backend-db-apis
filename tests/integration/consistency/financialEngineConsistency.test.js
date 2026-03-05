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

describe("financial engine consistency", () => {
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

  it("keeps projection consistent across planning, dashboard, and snapshots", async () => {
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
    const snapshot = await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: TEST_MONTH });

    expect(planningProjection.body.projected_balance).toBe(1100);
    expect(dashboard.body.projection).toBe(1100);
    expect(Number(snapshot.body.saldo_projetado)).toBe(1100);
  });

  it("enforces lock only for snapped month (cross-month isolation)", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    const januaryExpense = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ data_inicio: "2026-01-01", data_fim: "2026-01-31" }));
    const februaryExpense = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(
        expenseFixture({
          nome: `February Expense ${Date.now()}`,
          data_inicio: "2026-02-01",
          data_fim: "2026-02-28",
        }),
      );

    await request(app)
      .post("/monthly-snapshots")
      .set(authHeader)
      .send({ mes: "2026-01", confirm_negative: true });

    const lockedJanuaryUpdate = await request(app)
      .put(`/expenses/${januaryExpense.body.id}`)
      .set(authHeader)
      .send(expenseFixture({ nome: januaryExpense.body.nome, valor_total: 999, valor_mensal: 999 }));
    expect(lockedJanuaryUpdate.status).toBe(409);

    const openFebruaryUpdate = await request(app)
      .put(`/expenses/${februaryExpense.body.id}`)
      .set(authHeader)
      .send(
        expenseFixture({
          nome: februaryExpense.body.nome,
          valor_total: 888,
          valor_mensal: 888,
          data_inicio: "2026-02-01",
          data_fim: "2026-02-28",
        }),
      );
    expect(openFebruaryUpdate.status).toBe(200);
  });
});
