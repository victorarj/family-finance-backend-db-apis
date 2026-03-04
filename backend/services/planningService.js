import pool from "../db.js";

export function monthFromDate(dateString) {
  if (!dateString) return null;

  // pg can return Date objects for DATE columns depending on parser/runtime.
  if (dateString instanceof Date) {
    if (Number.isNaN(dateString.getTime())) return null;
    return dateString.toISOString().slice(0, 7);
  }

  const normalized = String(dateString);
  if (normalized.length < 7) return null;
  return normalized.slice(0, 7);
}

export async function hasSnapshotForMonth(usuarioId, mes) {
  const result = await pool.query(
    "SELECT 1 FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 AND mes = $2 LIMIT 1",
    [usuarioId, mes],
  );
  return result.rows.length > 0;
}

export async function assertMonthIsOpen(usuarioId, mes) {
  if (!mes) return;
  const locked = await hasSnapshotForMonth(usuarioId, mes);
  if (locked) {
    const err = new Error("Month is closed by snapshot");
    err.statusCode = 409;
    throw err;
  }
}

export async function deriveMonthStatus(usuarioId, mes) {
  const snapshot = await hasSnapshotForMonth(usuarioId, mes);
  if (snapshot) return "COMPLETED";

  const budgets = await pool.query(
    "SELECT 1 FROM ORCAMENTOS_MENSAIS WHERE usuario_id = $1 AND mes = $2 LIMIT 1",
    [usuarioId, mes],
  );
  if (budgets.rows.length > 0) return "IN_PROGRESS";

  const recurring = await pool.query(
    "SELECT 1 FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE LIMIT 1",
    [usuarioId],
  );
  if (recurring.rows.length > 0) return "IN_PROGRESS";

  return "NOT_STARTED";
}

export async function getLockedMonthsMap(usuarioId, months) {
  if (!months.length) return new Map();
  const result = await pool.query(
    "SELECT mes FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 AND mes = ANY($2::text[])",
    [usuarioId, months],
  );
  return new Map(result.rows.map((row) => [row.mes, true]));
}
