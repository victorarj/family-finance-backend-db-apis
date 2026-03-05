export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function userFixture(overrides = {}) {
  const suffix = uniqueSuffix();
  return {
    nome: `Test User ${suffix}`,
    email: `test.${suffix}@example.com`,
    senha: "TestPassword123!",
    telefone: "999999999",
    ...overrides,
  };
}
