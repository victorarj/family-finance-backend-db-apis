import request from "supertest";
import { userFixture } from "../fixtures/users.js";

export async function createAuthenticatedUser(app, overrides = {}) {
  const user = userFixture(overrides);
  const register = await request(app).post("/public").send(user);
  if (register.status !== 201) {
    throw new Error(`User registration failed: ${register.status}`);
  }
  const login = await request(app).post("/public/login").send({
    email: user.email,
    senha: user.senha,
  });
  if (login.status !== 200 || !login.body?.token) {
    throw new Error(`User login failed: ${login.status}`);
  }
  return {
    user,
    userId: register.body.id,
    token: login.body.token,
    authHeader: { Authorization: `Bearer ${login.body.token}` },
  };
}
