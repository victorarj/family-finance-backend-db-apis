export function incomeFixture(overrides = {}) {
  return {
    nome: "Salary",
    valor: 2000,
    data_recebimento: "2026-03-05",
    descricao: "Salary",
    moeda: "BRL",
    ...overrides,
  };
}

export function expenseFixture(overrides = {}) {
  return {
    nome: `Expense ${Date.now()}`,
    valor_total: 1000,
    valor_mensal: 1000,
    numero_parcelas: 1,
    data_inicio: "2026-03-01",
    data_fim: "2026-03-31",
    categoria_id: 1,
    prioridade_id: 1,
    debito_bancario: false,
    conta_bancaria_id: 1,
    frequencia_pagamento: "mensal",
    descricao: "Expense",
    tipo_despesa: "fixa",
    moeda: "BRL",
    ...overrides,
  };
}
