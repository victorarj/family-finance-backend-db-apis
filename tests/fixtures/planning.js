export const TEST_MONTH = "2026-03";

export function budgetFixture(overrides = {}) {
  return {
    mes: TEST_MONTH,
    categoria_id: 2,
    valor_planejado: 300,
    ...overrides,
  };
}

export function snapshotFixture(overrides = {}) {
  return {
    mes: TEST_MONTH,
    ...overrides,
  };
}
