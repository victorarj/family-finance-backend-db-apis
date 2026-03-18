import express from "express";
import pool from "../db.js";

const router = express.Router();

function parseCategoryId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getCategoryRowById(id) {
  const result = await pool.query(
    "SELECT id, nome, ativo, is_default FROM categorias WHERE id = $1 LIMIT 1",
    [id],
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
    can_delete: usage.canDelete,
  };
}

router.post("/", async (req, res) => {
  const { nome } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO categorias (nome, ativo, is_default) VALUES ($1, TRUE, FALSE) RETURNING id, nome, ativo, is_default",
      [nome],
    );
    res.status(201).json(await serializeCategory(result.rows[0]));
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
    const includeInactive = req.query.include_inactive === "true";
    const result = await pool.query(
      `SELECT id, nome, ativo, is_default
       FROM categorias
       ${includeInactive ? "" : "WHERE ativo = TRUE"}
       ORDER BY nome`,
    );
    const categories = await Promise.all(result.rows.map((row) => serializeCategory(row)));
    res.json(categories);
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
    const result = await pool.query(
      "UPDATE categorias SET nome = $1 WHERE id = $2 RETURNING id, nome, ativo, is_default",
      [nome, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(await serializeCategory(result.rows[0]));
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
    const result = await pool.query(
      "UPDATE categorias SET ativo = TRUE WHERE id = $1 RETURNING id, nome, ativo, is_default",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(await serializeCategory(result.rows[0]));
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
    const existing = await getCategoryRowById(id);
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    const usage = await getCategoryUsage(id);
    const mustSoftDelete = existing.is_default || usage.isInUse;

    if (mustSoftDelete) {
      const result = await pool.query(
        "UPDATE categorias SET ativo = FALSE WHERE id = $1 RETURNING id, nome, ativo, is_default",
        [id],
      );
      return res.json(await serializeCategory(result.rows[0]));
    }

    await pool.query("DELETE FROM categorias WHERE id = $1", [id]);
    res.json({
      ...(await serializeCategory(existing)),
      deleted: true,
      ativo: false,
      can_delete: true,
    });
  } catch (err) {
    console.error("Error deleting category: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
