import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../../setup/appFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";
import { userFixture } from "../../fixtures/users.js";

describe("public routes", () => {
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

  it("registers and logs in a user", async () => {
    const user = userFixture();
    const register = await request(app).post("/public").send(user);
    expect(register.status).toBe(201);
    expect(register.body.email).toBe(user.email);

    const login = await request(app).post("/public/login").send({
      email: user.email,
      senha: user.senha,
    });
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
  });
});
