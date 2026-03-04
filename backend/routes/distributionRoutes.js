import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";

const router = express.Router();

function parseComposite(id) {
  if (!id || !id.includes("|")) return null;
  const [dono_distribuicao, nome_distribuicao] = id.split("|");
  if (!dono_distribuicao || !nome_distribuicao) return null;
  return { dono_distribuicao, nome_distribuicao };
}

router.post("/", async (req, res) => {
  const { nome_distribuicao, data_distribuicao, valor_distribuido, moeda } =
    req.body;
  try {
    const user = await resolveAuthUser(req);
    const result = await pool.query(
      "INSERT INTO DISTRIBUICOES (dono_distribuicao, nome_distribuicao, data_distribuicao, valor_distribuido, moeda) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user.email, nome_distribuicao, data_distribuicao, valor_distribuido, moeda],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = await resolveAuthUser(req);
    const now = await pool.query(
      "SELECT * FROM DISTRIBUICOES WHERE dono_distribuicao = $1 ORDER BY data_distribuicao DESC",
      [user.email],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query distributions.");
  }
});

router.get("/:dono_distribuicao", async (req, res) => {
  try {
    const user = await resolveAuthUser(req);
    if (req.params.dono_distribuicao !== user.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const now = await pool.query(
      "SELECT * FROM DISTRIBUICOES WHERE dono_distribuicao = $1",
      [req.params.dono_distribuicao],
    );
    res.json(now.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("could not query distributions.");
  }
});

router.put("/:dono_distribuicao/:nome_distribuicao", async (req, res) => {
  const { dono_distribuicao, nome_distribuicao } = req.params;
  const { data_distribuicao, valor_distribuido, moeda } = req.body;
  try {
    const user = await resolveAuthUser(req);
    if (dono_distribuicao !== user.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await pool.query(
      "UPDATE DISTRIBUICOES SET data_distribuicao = $1, valor_distribuido = $2, moeda = $3 WHERE dono_distribuicao = $4 AND nome_distribuicao = $5 RETURNING *",
      [data_distribuicao, valor_distribuido, moeda, dono_distribuicao, nome_distribuicao],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:dono_distribuicao/:nome_distribuicao", async (req, res) => {
  const { dono_distribuicao, nome_distribuicao } = req.params;
  try {
    const user = await resolveAuthUser(req);
    if (dono_distribuicao !== user.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await pool.query(
      "DELETE FROM DISTRIBUICOES WHERE dono_distribuicao = $1 AND nome_distribuicao = $2 RETURNING *",
      [dono_distribuicao, nome_distribuicao],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

// Backward-compatible pattern using id="<email>|<nome_distribuicao>".
router.put("/:id", async (req, res) => {
  const parsed = parseComposite(req.params.id);
  if (!parsed) return res.status(400).json({ error: "Invalid distribution id" });
  const { data_distribuicao, valor_distribuido, moeda } = req.body;
  try {
    const user = await resolveAuthUser(req);
    if (parsed.dono_distribuicao !== user.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await pool.query(
      "UPDATE DISTRIBUICOES SET data_distribuicao = $1, valor_distribuido = $2, moeda = $3 WHERE dono_distribuicao = $4 AND nome_distribuicao = $5 RETURNING *",
      [
        data_distribuicao,
        valor_distribuido,
        moeda,
        parsed.dono_distribuicao,
        parsed.nome_distribuicao,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", async (req, res) => {
  const parsed = parseComposite(req.params.id);
  if (!parsed) return res.status(400).json({ error: "Invalid distribution id" });
  try {
    const user = await resolveAuthUser(req);
    if (parsed.dono_distribuicao !== user.email) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await pool.query(
      "DELETE FROM DISTRIBUICOES WHERE dono_distribuicao = $1 AND nome_distribuicao = $2 RETURNING *",
      [parsed.dono_distribuicao, parsed.nome_distribuicao],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Distribution not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error deleting distribution: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
