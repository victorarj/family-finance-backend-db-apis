import pool from "../db.js";

export async function resolveAuthUser(req) {
  if (!req.user || !req.user.id) {
    throw new Error("Unauthorized");
  }

  if (req.user.email) {
    return { id: req.user.id, email: req.user.email };
  }

  const result = await pool.query("SELECT id, email FROM USUARIOS WHERE id = $1", [
    req.user.id,
  ]);
  const user = result.rows[0];
  if (!user) {
    throw new Error("Unauthorized");
  }
  req.user.email = user.email;
  return user;
}
