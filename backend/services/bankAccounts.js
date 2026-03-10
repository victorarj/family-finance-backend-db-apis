import pool from "../db.js";

function normalizeTrimmedString(value) {
  return String(value || "").trim();
}

export function normalizeBankAccountInput(input = {}) {
  return {
    nome_conta: normalizeTrimmedString(input.nome_conta),
    banco: normalizeTrimmedString(input.banco),
    moeda: normalizeTrimmedString(input.moeda).toUpperCase(),
  };
}

export async function assertValidBankAccountInput(input) {
  const normalized = normalizeBankAccountInput(input);

  if (!normalized.nome_conta) {
    const error = new Error("Account name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!normalized.banco) {
    const error = new Error("Bank name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!/^[A-Z]{3}$/.test(normalized.moeda)) {
    const error = new Error("Currency must be a 3-letter ISO code");
    error.statusCode = 400;
    throw error;
  }

  const currency = await pool.query("SELECT codigo FROM MOEDAS WHERE codigo = $1", [normalized.moeda]);
  if (currency.rows.length === 0) {
    const error = new Error("Currency not supported");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

export function serializeBankAccount(row) {
  const isHistoricallyUsed =
    typeof row.is_historically_used === "boolean"
      ? row.is_historically_used
      : Boolean(row.is_historically_used);

  return {
    id: row.id,
    nome_conta: row.nome_conta,
    dono_conta: row.dono_conta,
    banco: row.banco,
    moeda: row.moeda,
    ativo: typeof row.ativo === "boolean" ? row.ativo : Boolean(row.ativo),
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_historically_used: isHistoricallyUsed,
    can_delete: !isHistoricallyUsed,
  };
}

export async function listBankAccountsByOwner(ownerEmail, { activeOnly = false } = {}) {
  const params = [ownerEmail];
  let activeClause = "";
  if (activeOnly) {
    params.push(true);
    activeClause = " AND conta.ativo = $2";
  }

  const result = await pool.query(
    `SELECT
      conta.*,
      EXISTS (
        SELECT 1
        FROM DESPESAS despesa
        WHERE despesa.conta_bancaria_id = conta.id
      ) AS is_historically_used
    FROM CONTAS_BANCARIAS conta
    WHERE conta.dono_conta = $1${activeClause}
    ORDER BY conta.ativo DESC, conta.nome_conta ASC, conta.id ASC`,
    params,
  );

  return result.rows.map(serializeBankAccount);
}

export async function getBankAccountByIdForOwner(id, ownerEmail) {
  const result = await pool.query(
    `SELECT
      conta.*,
      EXISTS (
        SELECT 1
        FROM DESPESAS despesa
        WHERE despesa.conta_bancaria_id = conta.id
      ) AS is_historically_used
    FROM CONTAS_BANCARIAS conta
    WHERE conta.id = $1 AND conta.dono_conta = $2`,
    [id, ownerEmail],
  );

  return result.rows[0] ? serializeBankAccount(result.rows[0]) : null;
}

export async function assertActiveBankAccountOwnership(accountId, ownerEmail) {
  const account = await getBankAccountByIdForOwner(accountId, ownerEmail);
  if (!account) {
    const error = new Error("Bank account not found");
    error.statusCode = 400;
    throw error;
  }
  if (!account.ativo) {
    const error = new Error("Inactive bank account cannot be used for new expenses");
    error.statusCode = 400;
    throw error;
  }
  return account;
}
