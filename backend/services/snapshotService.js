import pool from "../db.js";
import { getProjectionDataForMonth } from "./projectionService.js";

export async function computeSnapshotData(user, mes) {
  const projection = await getProjectionDataForMonth(user, mes);
  return {
    totalReceitas: projection.totalIncome,
    totalFixas: projection.fixedExpenses,
    totalVariaveis: projection.plannedVariable,
    saldoProjetado: projection.projectedBalance,
  };
}

export function requiresNegativeConfirmation(saldoProjetado, confirmNegative) {
  return Number(saldoProjetado) <= 0 && confirmNegative !== true;
}

export async function snapshotExistsForMonth(usuarioId, mes) {
  const existing = await pool.query(
    "SELECT 1 FROM SNAPSHOTS_MENSAIS WHERE usuario_id = $1 AND mes = $2",
    [usuarioId, mes],
  );
  return existing.rows.length > 0;
}
