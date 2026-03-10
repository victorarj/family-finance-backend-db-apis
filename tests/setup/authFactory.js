import request from "supertest";
import { userFixture } from "../fixtures/users.js";

export async function createAuthenticatedUser(app, overrides = {}) {
  const {
    createDefaultBankAccount = true,
    bankAccountOverrides = {},
    ...userOverrides
  } = overrides;
  const user = userFixture(userOverrides);
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
  let bankAccountId = null;
  if (createDefaultBankAccount) {
    const bankAccount = await request(app)
      .post("/bank-accounts")
      .set({ Authorization: `Bearer ${login.body.token}` })
      .send({
        nome_conta: "Conta Principal",
        banco: "Banco Teste",
        moeda: "BRL",
        ...bankAccountOverrides,
      });
    if (bankAccount.status !== 201) {
      throw new Error(`Bank account creation failed: ${bankAccount.status}`);
    }
    bankAccountId = bankAccount.body.id;
  }

  return {
    user,
    userId: register.body.id,
    token: login.body.token,
    authHeader: { Authorization: `Bearer ${login.body.token}` },
    bankAccountId,
  };
}
