import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { expenseFixture } from "../../fixtures/transactions.js";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";

describe("bank account routes", () => {
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

  it("returns only the authenticated user's accounts", async () => {
    const firstUser = await createAuthenticatedUser(app, {
      bankAccountOverrides: { nome_conta: "Conta A" },
    });
    await createAuthenticatedUser(app, {
      bankAccountOverrides: { nome_conta: "Conta B" },
    });

    const response = await request(app).get("/bank-accounts").set(firstUser.authHeader);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].nome_conta).toBe("Conta A");
    expect(response.body[0].can_delete).toBe(true);
  });

  it("creates, updates, and deactivates an owned bank account", async () => {
    const { authHeader } = await createAuthenticatedUser(app, { createDefaultBankAccount: false });

    const created = await request(app).post("/bank-accounts").set(authHeader).send({
      nome_conta: "Conta Casa",
      banco: "Banco XPTO",
      moeda: "brl",
    });
    expect(created.status).toBe(201);
    expect(created.body.ativo).toBe(true);
    expect(created.body.moeda).toBe("BRL");

    const updated = await request(app)
      .put(`/bank-accounts/${created.body.id}`)
      .set(authHeader)
      .send({
        nome_conta: "Conta Casa Editada",
        banco: "Banco Melhor",
        moeda: "EUR",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.nome_conta).toBe("Conta Casa Editada");
    expect(updated.body.banco).toBe("Banco Melhor");

    const deactivated = await request(app)
      .post(`/bank-accounts/${created.body.id}/deactivate`)
      .set(authHeader)
      .send({});
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.ativo).toBe(false);
  });

  it("rejects duplicate account names per user", async () => {
    const { authHeader } = await createAuthenticatedUser(app, {
      bankAccountOverrides: { nome_conta: "Conta Principal" },
    });

    const duplicate = await request(app).post("/bank-accounts").set(authHeader).send({
      nome_conta: "Conta Principal",
      banco: "Outro Banco",
      moeda: "BRL",
    });

    expect(duplicate.status).toBe(409);
  });

  it("deletes only historically unused accounts and blocks deletion once used", async () => {
    const { authHeader, bankAccountId } = await createAuthenticatedUser(app);

    const deletable = await request(app).post("/bank-accounts").set(authHeader).send({
      nome_conta: "Conta Temporaria",
      banco: "Banco Teste",
      moeda: "BRL",
    });
    expect(deletable.status).toBe(201);

    const deleted = await request(app)
      .delete(`/bank-accounts/${deletable.body.id}`)
      .set(authHeader);
    expect(deleted.status).toBe(200);

    const expense = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ conta_bancaria_id: bankAccountId }));
    expect(expense.status).toBe(201);

    const blockedDelete = await request(app)
      .delete(`/bank-accounts/${bankAccountId}`)
      .set(authHeader);
    expect(blockedDelete.status).toBe(409);
    expect(String(blockedDelete.body.error || "")).toMatch(/deactivated instead/i);
  });

  it("rejects using an inactive bank account for a new expense", async () => {
    const { authHeader, bankAccountId } = await createAuthenticatedUser(app);

    const deactivated = await request(app)
      .post(`/bank-accounts/${bankAccountId}/deactivate`)
      .set(authHeader)
      .send({});
    expect(deactivated.status).toBe(200);

    const expense = await request(app)
      .post("/expenses")
      .set(authHeader)
      .send(expenseFixture({ conta_bancaria_id: bankAccountId }));
    expect(expense.status).toBe(400);
    expect(String(expense.body.error || "")).toMatch(/inactive bank account/i);
  });

  it("forbids access to another user's account", async () => {
    const firstUser = await createAuthenticatedUser(app);
    const secondUser = await createAuthenticatedUser(app);

    const response = await request(app)
      .put(`/bank-accounts/${secondUser.bankAccountId}`)
      .set(firstUser.authHeader)
      .send({
        nome_conta: "Hack",
        banco: "Hack Bank",
        moeda: "BRL",
      });

    expect(response.status).toBe(404);
  });
});
