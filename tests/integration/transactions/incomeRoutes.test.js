import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";
import { incomeFixture } from "../../fixtures/transactions.js";

describe("income routes", () => {
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

  it("creates and updates income", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    const created = await request(app).post("/income").set(authHeader).send(incomeFixture());
    expect(created.status).toBe(201);
    expect(created.body.locked).toBe(false);

    const updated = await request(app)
      .put(`/income/${created.body.id}`)
      .set(authHeader)
      .send(incomeFixture({ nome: created.body.nome, valor: 2500 }));
    expect(updated.status).toBe(200);
    expect(Number(updated.body.valor)).toBe(2500);
  });
});
