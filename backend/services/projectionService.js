import pool from "../db.js";

export async function getProjectionDataForMonth(user, mes) {
  const [income, expenses, recurringIncome, recurringExpense, budgets] =
    await Promise.all([
      pool.query(
        "SELECT COALESCE(SUM(valor),0) AS total FROM RECEITAS WHERE dono_receita = $1 AND to_char(data_recebimento, 'YYYY-MM') = $2",
        [user.email, mes],
      ),
      pool.query(
        "SELECT COALESCE(SUM(valor_total),0) AS total FROM DESPESAS WHERE dono_despesa = $1 AND to_char(data_inicio, 'YYYY-MM') = $2",
        [user.email, mes],
      ),
      pool.query(
        "SELECT COALESCE(SUM(valor),0) AS total FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'income'",
        [user.id],
      ),
      pool.query(
        "SELECT COALESCE(SUM(valor),0) AS total FROM TRANSACOES_RECORRENTES WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'expense'",
        [user.id],
      ),
      pool.query(
        "SELECT COALESCE(SUM(valor_planejado),0) AS total FROM ORCAMENTOS_MENSAIS WHERE usuario_id = $1 AND mes = $2",
        [user.id, mes],
      ),
    ]);

  const incomeLogged = Number(income.rows[0].total);
  const expensesLogged = Number(expenses.rows[0].total);
  const recurringIncomeTotal = Number(recurringIncome.rows[0].total);
  const fixedExpenses = Number(recurringExpense.rows[0].total);
  const plannedVariable = Number(budgets.rows[0].total);

  const totalIncome = incomeLogged + recurringIncomeTotal;
  const totalExpenses = expensesLogged + fixedExpenses;
  const projectedBalance = totalIncome - fixedExpenses - plannedVariable;

  return {
    month: mes,
    incomeLogged,
    recurringIncome: recurringIncomeTotal,
    totalIncome,
    expensesLogged,
    fixedExpenses,
    plannedVariable,
    totalExpenses,
    projectedBalance,
  };
}
