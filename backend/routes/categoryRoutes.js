import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";

const router = express.Router();

function parseCategoryId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getCategoryBaseForUser(id, userEmail) {
  const result = await pool.query(
    `SELECT c.id,
            c.nome,
            c.is_default,
            c.owner_email,
            CASE
              WHEN c.is_default THEN COALESCE(cu.ativo, TRUE)
              ELSE c.ativo
            END AS ativo
     FROM categorias c
     LEFT JOIN categorias_usuario cu
       ON cu.categoria_id = c.id
      AND cu.usuario_email = $2
     WHERE c.id = $1
       AND (c.is_default = TRUE OR c.owner_email = $2)
     LIMIT 1`,
    [id, userEmail],
  );
  return result.rows[0] || null;
}

async function getCategoryUsage(id) {
  const result = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM despesas WHERE categoria_id = $1) AS has_expenses,
            EXISTS(SELECT 1 FROM transacoes_recorrentes WHERE categoria_id = $1) AS has_recurring,
            EXISTS(SELECT 1 FROM orcamentos_mensais WHERE categoria_id = $1) AS has_budgets`,
    [id],
  );
  const row = result.rows[0];
  const isInUse = Boolean(row?.has_expenses || row?.has_recurring || row?.has_budgets);
  return {
    isInUse,
    canDelete: !isInUse,
  };
}

async function serializeCategory(row) {
  const usage = await getCategoryUsage(row.id);
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo,
    is_default: row.is_default,
    is_in_use: usage.isInUse,
    can_delete: !row.is_default && usage.canDelete,
    can_edit: !row.is_default,
  };
}

router.post("/", async (req, res) => {
  const { nome } = req.body;
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      `INSERT INTO categorias (nome, ativo, is_default, owner_email)
       VALUES ($1, TRUE, FALSE, $2)
       RETURNING id`,
      [nome, auth.email],
    );
    const created = await getCategoryBaseForUser(result.rows[0].id, auth.email);
    res.status(201).json(await serializeCategory(created));
  } catch (err) {
    console.error("Error creating category: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Category already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const includeInactive = req.query.include_inactive === "true";
    const result = await pool.query(
      `SELECT c.id,
              c.nome,
              c.is_default,
              c.owner_email,
              CASE
                WHEN c.is_default THEN COALESCE(cu.ativo, TRUE)
                ELSE c.ativo
              END AS ativo
       FROM categorias c
       LEFT JOIN categorias_usuario cu
         ON cu.categoria_id = c.id
        AND cu.usuario_email = $1
       WHERE c.is_default = TRUE OR c.owner_email = $1
       ORDER BY c.nome`,
      [auth.email],
    );
    const serialized = await Promise.all(result.rows.map((row) => serializeCategory(row)));
    res.json(includeInactive ? serialized : serialized.filter((item) => item.ativo));
  } catch (err) {
    console.error("Error querying categories: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseCategoryId(req.params.id);
  const { nome } = req.body;
  if (!id) {
    return res.status(400).json({ error: "invalid category id" });
  }

  try {
    const auth = await resolveAuthUser(req);
    const existing = await getCategoryBaseForUser(id, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }
    if (existing.is_default) {
      return res.status(403).json({ error: "Default categories cannot be renamed" });
    }

    await pool.query(
      "UPDATE categorias SET nome = $1 WHERE id = $2 AND owner_email = $3",
      [nome, id, auth.email],
    );
    const updated = await getCategoryBaseForUser(id, auth.email);
    res.json(await serializeCategory(updated));
  } catch (err) {
    console.error("Error updating category: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Category already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.post("/:id/activate", async (req, res) => {
  const id = parseCategoryId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "invalid category id" });
  }

  try {
    const auth = await resolveAuthUser(req);
    const existing = await getCategoryBaseForUser(id, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (existing.is_default) {
      await pool.query(
        `INSERT INTO categorias_usuario (usuario_email, categoria_id, ativo)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (usuario_email, categoria_id)
         DO UPDATE SET ativo = EXCLUDED.ativo`,
        [auth.email, id],
      );
    } else {
      await pool.query(
        "UPDATE categorias SET ativo = TRUE WHERE id = $1 AND owner_email = $2",
        [id, auth.email],
      );
    }

    const updated = await getCategoryBaseForUser(id, auth.email);
    res.json(await serializeCategory(updated));
  } catch (err) {
    console.error("Error activating category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseCategoryId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "invalid category id" });
  }

  try {
    const auth = await resolveAuthUser(req);
    const existing = await getCategoryBaseForUser(id, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (existing.is_default) {
      await pool.query(
        `INSERT INTO categorias_usuario (usuario_email, categoria_id, ativo)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (usuario_email, categoria_id)
         DO UPDATE SET ativo = EXCLUDED.ativo`,
        [auth.email, id],
      );
      const updated = await getCategoryBaseForUser(id, auth.email);
      return res.json(await serializeCategory(updated));
    }

    const usage = await getCategoryUsage(id);
    if (usage.isInUse) {
      await pool.query(
        "UPDATE categorias SET ativo = FALSE WHERE id = $1 AND owner_email = $2",
        [id, auth.email],
      );
      const updated = await getCategoryBaseForUser(id, auth.email);
      return res.json(await serializeCategory(updated));
    }

    const deleted = await serializeCategory(existing);
    await pool.query("DELETE FROM categorias WHERE id = $1 AND owner_email = $2", [id, auth.email]);
    res.json({ ...deleted, deleted: true, ativo: false });
  } catch (err) {
    console.error("Error deleting category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
