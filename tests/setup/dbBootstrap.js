import { readFile } from "node:fs/promises";

export async function applySqlFile(pool, filePath) {
  const sql = await readFile(filePath, "utf8");
  await pool.query(sql);
}
