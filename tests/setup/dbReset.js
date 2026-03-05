export async function resetDatabase(pool) {
  await pool.query(`
    TRUNCATE TABLE
      ALOCACOES_SUPERAVIT,
      SNAPSHOTS_MENSAIS,
      ORCAMENTOS_MENSAIS,
      TRANSACOES_RECORRENTES,
      PREFERENCIAS_USUARIO,
      RECEITAS,
      DESPESAS,
      DISTRIBUICOES,
      RESUMOS
    RESTART IDENTITY CASCADE;
  `);
  await pool.query(
    "DELETE FROM CONTAS_BANCARIAS WHERE dono_conta <> 'admin@example.com'",
  );
  await pool.query(
    "DELETE FROM USUARIOS WHERE email <> 'admin@example.com'",
  );
}
