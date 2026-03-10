import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";

describe("user onboarding routes", () => {
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

  it("returns current user metadata including onboarding status", async () => {
    const { authHeader, userId, user } = await createAuthenticatedUser(app, {
      createDefaultBankAccount: false,
    });

    const response = await request(app).get("/users/me").set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userId);
    expect(response.body.email).toBe(user.email);
    expect(response.body.onboarding_completed_at).toBeNull();
  });

  it("requires saved preferences before completing onboarding", async () => {
    const { authHeader } = await createAuthenticatedUser(app, {
      createDefaultBankAccount: false,
    });

    const blocked = await request(app)
      .post("/users/me/onboarding/complete")
      .set(authHeader)
      .send({});
    expect(blocked.status).toBe(400);

    const savedPreferences = await request(app).post("/preferences").set(authHeader).send({
      tipo_residencia: "apartamento",
      modo_registro: "completo",
      planejamento_guiado: true,
    });
    expect(savedPreferences.status).toBe(201);

    const completed = await request(app)
      .post("/users/me/onboarding/complete")
      .set(authHeader)
      .send({});
    expect(completed.status).toBe(200);
    expect(completed.body.onboarding_completed_at).toBeTruthy();
  });
});
