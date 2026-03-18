import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";

const router = express.Router();

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

async function getCurrencyBaseForUser(code, userEmail) {
  const result = await pool.query(
    `SELECT m.codigo,
            m.is_default,
            m.owner_email,
            CASE
              WHEN m.is_default THEN COALESCE(mu.ativo, TRUE)
              ELSE m.ativo
            END AS ativo
     FROM moedas m
     LEFT JOIN moedas_usuario mu
       ON mu.moeda_codigo = m.codigo
      AND mu.usuario_email = $2
     WHERE m.codigo = $1
       AND (m.is_default = TRUE OR m.owner_email = $2)
     LIMIT 1`,
    [code, userEmail],
  );
  return result.rows[0] || null;
}

async function getCurrencyUsage(code) {
  const result = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM contas_bancarias WHERE moeda = $1) AS has_bank_accounts,
            EXISTS(SELECT 1 FROM despesas WHERE moeda = $1) AS has_expenses,
            EXISTS(SELECT 1 FROM receitas WHERE moeda = $1) AS has_income,
            EXISTS(SELECT 1 FROM resumos WHERE moeda = $1) AS has_resumes,
            EXISTS(SELECT 1 FROM distribuicoes WHERE moeda = $1) AS has_distributions`,
    [code],
  );
  const row = result.rows[0];
  const isInUse = Boolean(
    row?.has_bank_accounts ||
      row?.has_expenses ||
      row?.has_income ||
      row?.has_resumes ||
      row?.has_distributions,
  );
  return {
    isInUse,
    canDelete: !isInUse,
  };
}

async function serializeCurrency(row) {
  const usage = await getCurrencyUsage(row.codigo);
  return {
    codigo: row.codigo,
    ativo: row.ativo,
    is_default: row.is_default,
    is_in_use: usage.isInUse,
    can_delete: !row.is_default && usage.canDelete,
    can_edit: !row.is_default && !usage.isInUse,
  };
}

router.post("/", async (req, res) => {
  const codigo = normalizeCode(req.body.codigo);
  try {
    const auth = await resolveAuthUser(req);
    const result = await pool.query(
      `INSERT INTO moedas (codigo, ativo, is_default, owner_email)
       VALUES ($1, TRUE, FALSE, $2)
       RETURNING codigo`,
      [codigo, auth.email],
    );
    const created = await getCurrencyBaseForUser(result.rows[0].codigo, auth.email);
    res.status(201).json(await serializeCurrency(created));
  } catch (err) {
    console.error("Error creating currency: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const includeInactive = req.query.include_inactive === "true";
    const result = await pool.query(
      `SELECT m.codigo,
              m.is_default,
              m.owner_email,
              CASE
                WHEN m.is_default THEN COALESCE(mu.ativo, TRUE)
                ELSE m.ativo
              END AS ativo
       FROM moedas m
       LEFT JOIN moedas_usuario mu
         ON mu.moeda_codigo = m.codigo
        AND mu.usuario_email = $1
       WHERE m.is_default = TRUE OR m.owner_email = $1
       ORDER BY m.codigo`,
      [auth.email],
    );
    const serialized = await Promise.all(result.rows.map((row) => serializeCurrency(row)));
    res.json(includeInactive ? serialized : serialized.filter((item) => item.ativo));
  } catch (err) {
    console.error("Error querying currencies: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.put("/:codigo", async (req, res) => {
  const codigo = normalizeCode(req.params.codigo);
  const novoCodigo = normalizeCode(req.body.novo_codigo);
  try {
    const auth = await resolveAuthUser(req);
    const existing = await getCurrencyBaseForUser(codigo, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Currency not found" });
    }
    if (existing.is_default) {
      return res.status(403).json({ error: "Default currencies cannot be renamed" });
    }

    const usage = await getCurrencyUsage(codigo);
    if (usage.isInUse) {
      return res.status(409).json({ error: "In-use currencies cannot be renamed" });
    }

    await pool.query(
      "UPDATE moedas SET codigo = $1 WHERE codigo = $2 AND owner_email = $3",
      [novoCodigo, codigo, auth.email],
    );
    const updated = await getCurrencyBaseForUser(novoCodigo, auth.email);
    res.json(await serializeCurrency(updated));
  } catch (err) {
    console.error("Error updating currency: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency already exists" });
    }
    res.status(500).json({ error: "database error" });
  }
});

router.post("/:codigo/activate", async (req, res) => {
  const codigo = normalizeCode(req.params.codigo);
  try {
    const auth = await resolveAuthUser(req);
    const existing = await getCurrencyBaseForUser(codigo, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Currency not found" });
    }

    if (existing.is_default) {
      await pool.query(
        `INSERT INTO moedas_usuario (usuario_email, moeda_codigo, ativo)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (usuario_email, moeda_codigo)
         DO UPDATE SET ativo = EXCLUDED.ativo`,
        [auth.email, codigo],
      );
    } else {
      await pool.query(
        "UPDATE moedas SET ativo = TRUE WHERE codigo = $1 AND owner_email = $2",
        [codigo, auth.email],
      );
    }

    const updated = await getCurrencyBaseForUser(codigo, auth.email);
    res.json(await serializeCurrency(updated));
  } catch (err) {
    console.error("Error activating currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:codigo", async (req, res) => {
  const codigo = normalizeCode(req.params.codigo);
  try {
    const auth = await resolveAuthUser(req);
    const existing = await getCurrencyBaseForUser(codigo, auth.email);
    if (!existing) {
      return res.status(404).json({ error: "Currency not found" });
    }

    if (existing.is_default) {
      await pool.query(
        `INSERT INTO moedas_usuario (usuario_email, moeda_codigo, ativo)
         VALUES ($1, $2, FALSE)
         ON CONFLICT (usuario_email, moeda_codigo)
         DO UPDATE SET ativo = EXCLUDED.ativo`,
        [auth.email, codigo],
      );
      const updated = await getCurrencyBaseForUser(codigo, auth.email);
      return res.json(await serializeCurrency(updated));
    }

    const usage = await getCurrencyUsage(codigo);
    if (usage.isInUse) {
      await pool.query(
        "UPDATE moedas SET ativo = FALSE WHERE codigo = $1 AND owner_email = $2",
        [codigo, auth.email],
      );
      const updated = await getCurrencyBaseForUser(codigo, auth.email);
      return res.json(await serializeCurrency(updated));
    }

    const deleted = await serializeCurrency(existing);
    await pool.query("DELETE FROM moedas WHERE codigo = $1 AND owner_email = $2", [codigo, auth.email]);
    res.json({ ...deleted, deleted: true, ativo: false });
  } catch (err) {
    console.error("Error deleting currency: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
