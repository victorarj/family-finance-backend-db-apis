import express from "express";
import pool from "../db.js";
import { resolveAuthUser } from "../services/authUser.js";
import { query as queryAiService } from "../services/aiService.js";

const router = express.Router();

function parseDocumentId(rawValue) {
  const parsed = Number.parseInt(String(rawValue), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function loadOwnedDocuments(userId, documentIds) {
  if (!documentIds.length) {
    return [];
  }

  const result = await pool.query(
    `SELECT id
     FROM documents
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND id = ANY($2::int[])`,
    [userId, documentIds],
  );

  return result.rows.map((row) => row.id);
}

router.post("/query", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
    const rawDocumentIds = req.body.document_ids;

    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }

    if (rawDocumentIds !== undefined && !Array.isArray(rawDocumentIds)) {
      return res.status(400).json({ error: "document_ids must be an array" });
    }

    const documentIds = (rawDocumentIds || []).map(parseDocumentId);
    if (documentIds.some((value) => !value)) {
      return res.status(400).json({ error: "document_ids must contain valid ids" });
    }

    const ownedIds = await loadOwnedDocuments(auth.id, documentIds);
    if (ownedIds.length !== documentIds.length) {
      return res.status(403).json({ error: "one or more document_ids are not accessible" });
    }

    const response = await queryAiService({
      question,
      userId: auth.id,
      documentIds,
    });

    res.status(response.status);
    res.type(response.contentType);
    if (typeof response.body === "string") {
      return res.send(response.body);
    }
    return res.json(response.body);
  } catch (err) {
    console.error("Error proxying AI query: ", err);
    res.status(502).json({ error: "ai service unavailable" });
  }
});

router.get("/documents/:id/chunks", async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const documentId = parseDocumentId(req.params.id);

    if (!documentId) {
      return res.status(400).json({ error: "invalid document id" });
    }

    const documentResult = await pool.query(
      `SELECT id, user_id, deleted_at
       FROM documents
       WHERE id = $1
       LIMIT 1`,
      [documentId],
    );

    if (!documentResult.rows.length) {
      return res.status(404).json({ error: "Document not found" });
    }

    const document = documentResult.rows[0];
    const isAdmin = auth.email === process.env.ADMIN_EMAIL;
    const isOwner = document.user_id === auth.id;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (document.deleted_at && !isAdmin) {
      return res.status(404).json({ error: "Document not found" });
    }

    const chunksResult = await pool.query(
      `SELECT id, document_id, user_id, content, chunk_index, created_at
       FROM document_chunks
       WHERE document_id = $1
       ORDER BY chunk_index ASC, id ASC`,
      [documentId],
    );

    res.json(chunksResult.rows);
  } catch (err) {
    console.error("Error fetching document chunks: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
