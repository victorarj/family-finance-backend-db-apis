# Finances API - Request Examples

This document contains practical examples for all API endpoints. You can use these with `curl`, Postman, or any HTTP client.

**Base URL:** `http://localhost:3000`

---

## 📋 Table of Contents

1. [Users](#users)
2. [Expenses](#expenses)
3. [Bank Accounts](#bank-accounts)
4. [Categories](#categories)
5. [Currencies](#currencies)
6. [Priorities](#priorities)
7. [Recipes (Income)](#recipes-income)
8. [Resumes](#resumes)
9. [Distributions](#distributions)
10. [Taxes/Representativities](#taxesrepresentativities)

---

## Users

### Create User

**Request:**

```bash
curl -X POST http://localhost:3000/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@example.com",
    "senha": "senha123",
    "telefone": "11999999999"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/users/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "João Silva",
    email: "joao@example.com",
    senha: "senha123",
    telefone: "11999999999",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@example.com",
  "telefone": "11999999999"
}
```

---

### Find User by ID

**Request:**

```bash
curl http://localhost:3000/users/find/1
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/users/find/1")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "senha123",
  "telefone": "11999999999"
}
```

---

## Expenses

### Create Expense

**Request:**

```bash
curl -X POST http://localhost:3000/expenses/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Aluguel",
    "valor_total": 1500.00,
    "valor_mensal": 1500.00,
    "numero_parcelas": 1,
    "data_inicio": "2026-02-26",
    "data_fim": "2026-03-26",
    "debito_bancario": true,
    "categoria_id": 1,
    "prioridade_id": 1,
    "conta_bancaria_id": 1,
    "frequencia_pagamento": "mensal",
    "descricao": "Aluguel do apartamento",
    "tipo_despesa": "fixa",
    "dono_despesa": "joao@example.com",
    "moeda": "BRL"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/expenses/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Aluguel",
    valor_total: 1500.0,
    valor_mensal: 1500.0,
    numero_parcelas: 1,
    data_inicio: "2026-02-26",
    data_fim: "2026-03-26",
    debito_bancario: true,
    categoria_id: 1,
    prioridade_id: 1,
    conta_bancaria_id: 1,
    frequencia_pagamento: "mensal",
    descricao: "Aluguel do apartamento",
    tipo_despesa: "fixa",
    dono_despesa: "joao@example.com",
    moeda: "BRL",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome": "Aluguel",
  "valor_total": 1500.0,
  "valor_mensal": 1500.0,
  "numero_parcelas": 1,
  "data_inicio": "2026-02-26",
  "data_fim": "2026-03-26",
  "debito_bancario": true,
  "categoria_id": 1,
  "prioridade_id": 1,
  "conta_bancaria_id": 1,
  "frequencia_pagamento": "mensal",
  "descricao": "Aluguel do apartamento",
  "tipo_despesa": "fixa",
  "dono_despesa": "joao@example.com",
  "moeda": "BRL"
}
```

---

### Get All Expenses

**Request:**

```bash
curl http://localhost:3000/expenses/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/expenses/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome": "Aluguel",
    "valor_total": 1500.0,
    "valor_mensal": 1500.0,
    "dono_despesa": "joao@example.com"
  },
  {
    "id": 2,
    "nome": "Internet",
    "valor_total": 89.9,
    "valor_mensal": 89.9,
    "dono_despesa": "joao@example.com"
  }
]
```

---

## Bank Accounts

### Create Bank Account

**Request:**

```bash
curl -X POST http://localhost:3000/bank-accounts/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome_conta": "Conta Corrente",
    "dono_conta": "joao@example.com",
    "banco": "Itaú",
    "moeda": "BRL"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/bank-accounts/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome_conta: "Conta Corrente",
    dono_conta: "joao@example.com",
    banco: "Itaú",
    moeda: "BRL",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome_conta": "Conta Corrente",
  "dono_conta": "joao@example.com",
  "banco": "Itaú",
  "moeda": "BRL"
}
```

---

### Get All Bank Accounts

**Request:**

```bash
curl http://localhost:3000/bank-accounts/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/bank-accounts/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome_conta": "Conta Corrente",
    "dono_conta": "joao@example.com",
    "banco": "Itaú",
    "moeda": "BRL"
  },
  {
    "id": 2,
    "nome_conta": "Poupança",
    "dono_conta": "joao@example.com",
    "banco": "Bradesco",
    "moeda": "BRL"
  }
]
```

---

## Categories

### Create Category

**Request:**

```bash
curl -X POST http://localhost:3000/categories/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Alimentação"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/categories/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Alimentação",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome": "Alimentação"
}
```

---

### Get All Categories

**Request:**

```bash
curl http://localhost:3000/categories/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/categories/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome": "Alimentação"
  },
  {
    "id": 2,
    "nome": "Transporte"
  },
  {
    "id": 3,
    "nome": "Saúde"
  }
]
```

---

## Currencies

### Create Currency

**Request:**

```bash
curl -X POST http://localhost:3000/currencies/create \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "BRL"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/currencies/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    codigo: "BRL",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "codigo": "BRL"
}
```

---

### Get All Currencies

**Request:**

```bash
curl http://localhost:3000/currencies/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/currencies/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "codigo": "BRL"
  },
  {
    "codigo": "USD"
  },
  {
    "codigo": "EUR"
  }
]
```

---

## Priorities

### Create Priority

**Request:**

```bash
curl -X POST http://localhost:3000/priorities/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Alta",
    "nivel": 1
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/priorities/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Alta",
    nivel: 1,
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome": "Alta",
  "nivel": 1
}
```

---

### Get All Priorities

**Request:**

```bash
curl http://localhost:3000/priorities/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/priorities/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome": "Alta",
    "nivel": 1
  },
  {
    "id": 2,
    "nome": "Média",
    "nivel": 2
  },
  {
    "id": 3,
    "nome": "Baixa",
    "nivel": 3
  }
]
```

---

## Recipes (Income)

### Create Recipe/Income

**Request:**

```bash
curl -X POST http://localhost:3000/recipes/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Salário",
    "valor": 5000.00,
    "dono_receita": "joao@example.com",
    "data_recebimento": "2026-02-26",
    "descricao": "Salário mensal",
    "moeda": "BRL"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/recipes/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Salário",
    valor: 5000.0,
    dono_receita: "joao@example.com",
    data_recebimento: "2026-02-26",
    descricao: "Salário mensal",
    moeda: "BRL",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome": "Salário",
  "valor": 5000.0,
  "dono_receita": "joao@example.com",
  "data_recebimento": "2026-02-26",
  "descricao": "Salário mensal",
  "moeda": "BRL"
}
```

---

### Get All Recipes/Income

**Request:**

```bash
curl http://localhost:3000/recipes/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/recipes/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome": "Salário",
    "valor": 5000.0,
    "dono_receita": "joao@example.com",
    "data_recebimento": "2026-02-26"
  },
  {
    "id": 2,
    "nome": "Freelance",
    "valor": 1500.0,
    "dono_receita": "joao@example.com",
    "data_recebimento": "2026-02-20"
  }
]
```

---

## Resumes

### Create Resume (Summary)

**Request:**

```bash
curl -X POST http://localhost:3000/resumes/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome_resumo": "Fevereiro 2026",
    "total_despesas": 2500.00,
    "total_receitas": 5000.00,
    "saldo": 2500.00,
    "data_resumo": "2026-02-26"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/resumes/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome_resumo: "Fevereiro 2026",
    total_despesas: 2500.0,
    total_receitas: 5000.0,
    saldo: 2500.0,
    data_resumo: "2026-02-26",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome_resumo": "Fevereiro 2026",
  "total_despesas": 2500.0,
  "total_receitas": 5000.0,
  "saldo": 2500.0,
  "data_resumo": "2026-02-26"
}
```

---

### Get All Resumes

**Request:**

```bash
curl http://localhost:3000/resumes/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/resumes/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome_resumo": "Janeiro 2026",
    "total_despesas": 2300.0,
    "total_receitas": 5000.0,
    "saldo": 2700.0,
    "data_resumo": "2026-01-31"
  },
  {
    "id": 2,
    "nome_resumo": "Fevereiro 2026",
    "total_despesas": 2500.0,
    "total_receitas": 5000.0,
    "saldo": 2500.0,
    "data_resumo": "2026-02-26"
  }
]
```

---

## Distributions

### Create Distribution

**Request:**

```bash
curl -X POST http://localhost:3000/distributions/create \
  -H "Content-Type: application/json" \
  -d '{
    "dono_distribuicao": "joao@example.com",
    "nome_distribuicao": "Distribuição Mensal",
    "valor_distribuido": 1000.00,
    "data_distribuicao": "2026-02-26",
    "moeda": "BRL"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/distributions/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dono_distribuicao: "joao@example.com",
    nome_distribuicao: "Distribuição Mensal",
    valor_distribuido: 1000.0,
    data_distribuicao: "2026-02-26",
    moeda: "BRL",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "dono_distribuicao": "joao@example.com",
  "nome_distribuicao": "Distribuição Mensal",
  "valor_distribuido": 1000.0,
  "data_distribuicao": "2026-02-26",
  "moeda": "BRL"
}
```

---

### Get All Distributions

**Request:**

```bash
curl http://localhost:3000/distributions/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/distributions/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "dono_distribuicao": "joao@example.com",
    "nome_distribuicao": "Distribuição Mensal",
    "valor_distribuido": 1000.0,
    "data_distribuicao": "2026-02-26",
    "moeda": "BRL"
  },
  {
    "dono_distribuicao": "joao@example.com",
    "nome_distribuicao": "Investimento",
    "valor_distribuido": 500.0,
    "data_distribuicao": "2026-02-20",
    "moeda": "BRL"
  }
]
```

---

## Taxes/Representativities

### Create Tax/Representativity

**Request:**

```bash
curl -X POST http://localhost:3000/taxes/create \
  -H "Content-Type: application/json" \
  -d '{
    "nome_representatividade": "ISS",
    "percentual": 5.00,
    "dono_representatividade": "joao@example.com"
  }'
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/taxes/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome_representatividade: "ISS",
    percentual: 5.0,
    dono_representatividade: "joao@example.com",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (201):**

```json
{
  "id": 1,
  "nome_representatividade": "ISS",
  "percentual": 5.0,
  "dono_representatividade": "joao@example.com"
}
```

---

### Get All Taxes/Representativities

**Request:**

```bash
curl http://localhost:3000/taxes/find
```

**JavaScript/Fetch:**

```javascript
fetch("http://localhost:3000/taxes/find")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nome_representatividade": "ISS",
    "percentual": 5.0,
    "dono_representatividade": "joao@example.com"
  },
  {
    "id": 2,
    "nome_representatividade": "ICMS",
    "percentual": 18.0,
    "dono_representatividade": "joao@example.com"
  }
]
```

---

## Testing with Postman

1. Import `swagger.json` into Postman
2. Set the base URL to `http://localhost:3000`
3. Use the examples above in the request body
4. Make sure Docker containers are running: `docker compose up -d`

## Testing with cURL

All examples above can be run directly from your terminal with `curl` installed.

## Testing with JavaScript

Copy the fetch examples into your browser console or Node.js environment to test the API.

---

**Last Updated:** February 26, 2026
