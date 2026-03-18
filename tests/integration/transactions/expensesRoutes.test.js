import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";
import { expenseFixture } from "../../fixtures/transactions.js";

describe("expenses routes", () => {
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

  it("creates and updates an expense", async () => {
    const { authHeader, bankAccountId } = await createAuthenticatedUser(app);
    const created = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ valor_total: 200, valor_mensal: 200, conta_bancaria_id: bankAccountId }));
    expect(created.status).toBe(201);
    expect(created.body.locked).toBe(false);

    const updated = await request(app)
      .put(`/expenses/${created.body.id}`)
      .set(authHeader)
      .send(
        expenseFixture({
          nome: created.body.nome,
          valor_total: 300,
          valor_mensal: 300,
          conta_bancaria_id: bankAccountId,
        }),
      );
    expect(updated.status).toBe(200);
    expect(Number(updated.body.valor_total)).toBe(300);
  });

  it("rejects unauthorized request", async () => {
    const res = await request(app).post("/expenses").send(expenseFixture());
    expect(res.status).toBe(401);
  });

  it("allows different users to create expenses with the same name", async () => {
    const firstUser = await createAuthenticatedUser(app);
    const secondUser = await createAuthenticatedUser(app);
    const sharedName = "Alimentação · 18/03/2026";

    const firstCreated = await request(app)
      .post("/expenses")
      .set(firstUser.authHeader)
      .send(
        expenseFixture({
          nome: sharedName,
          conta_bancaria_id: firstUser.bankAccountId,
        }),
      );

    const secondCreated = await request(app)
      .post("/expenses")
      .set(secondUser.authHeader)
      .send(
        expenseFixture({
          nome: sharedName,
          conta_bancaria_id: secondUser.bankAccountId,
        }),
      );

    expect(firstCreated.status).toBe(201);
    expect(secondCreated.status).toBe(201);
    expect(firstCreated.body.dono_despesa).not.toBe(secondCreated.body.dono_despesa);
  });
});
