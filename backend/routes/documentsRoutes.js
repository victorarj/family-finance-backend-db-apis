import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import pool from "../db.js";
import auth from "../middlewares/auth.js";
import internalApiAuth from "../middlewares/internalApiAuth.js";
import { resolveAuthUser } from "../services/authUser.js";
import { requestDocumentIngestion, isAiIngestionConfigured } from "../services/documentIngestion.js";
import { deleteDocumentObject, uploadDocumentObject } from "../services/objectStorage.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const ALLOWED_SOURCE_TYPES = new Set(["payslip", "bill", "bank_statement", "other"]);
const ALLOWED_STATUSES = new Set(["uploaded", "processing", "ready", "failed"]);

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDocumentId(rawValue) {
  const parsed = Number.parseInt(String(rawValue), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildStorageKey({ userId, filename }) {
  const safeFilename = String(filename || "document")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "document";
  return `documents/${userId}/${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;
}

async function markDocumentFailed(documentId) {
  await pool.query(
    `UPDATE documents
     SET status = 'failed'::document_status
     WHERE id = $1 AND deleted_at IS NULL`,
    [documentId],
  );
}

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  let createdDocumentId = null;
  let storageKey = null;

  try {
    const auth = await resolveAuthUser(req);
    const file = req.file;
    const sourceType = req.body.source_type ? String(req.body.source_type) : "other";

    if (!file) {
      return res.status(400).json({ error: "file is required" });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ error: "unsupported mime type" });
    }

    if (!ALLOWED_SOURCE_TYPES.has(sourceType)) {
      return res.status(400).json({ error: "invalid source_type" });
    }

    storageKey = buildStorageKey({ userId: auth.id, filename: file.originalname });
    const result = await pool.query(
      `INSERT INTO documents (user_id, filename, mime_type, storage_key, source_type, status)
       VALUES ($1, $2, $3, $4, $5, 'uploaded')
       RETURNING id, user_id, filename, mime_type, storage_key, source_type, status, uploaded_at, processed_at, deleted_at`,
      [auth.id, file.originalname, file.mimetype, storageKey, sourceType],
    );

    const document = result.rows[0];
    createdDocumentId = document.id;

    await uploadDocumentObject({
      storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const ingestionRequested = isAiIngestionConfigured();
    if (ingestionRequested) {
      void requestDocumentIngestion({
        documentId: document.id,
        userId: auth.id,
        storageKey,
        sourceType,
      }).catch(async (error) => {
        console.error("Error requesting document ingestion: ", error);
        try {
          await markDocumentFailed(document.id);
        } catch (statusError) {
          console.error("Error marking document as failed after ingestion request failure: ", statusError);
        }
      });
    }

    res.status(201).json({
      document_id: document.id,
      storage_key: storageKey,
      document,
      ingestion_requested: ingestionRequested,
    });
  } catch (err) {
    if (createdDocumentId) {
      await pool.query("DELETE FROM documents WHERE id = $1", [createdDocumentId]).catch(() => {});
    }
    if (storageKey) {
      await deleteDocumentObject(storageKey).catch(() => {});
    }

    console.error("Error creating document upload metadata: ", err);
    res.status(500).json({ error: "document upload failed" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const [itemsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, user_id, filename, mime_type, storage_key, source_type, status, uploaded_at, processed_at, deleted_at
         FROM documents
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY uploaded_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [auth.id, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(*)::INT AS total
         FROM documents
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [auth.id],
      ),
    ]);

    const total = countResult.rows[0].total;
    res.json({
      items: itemsResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error listing documents: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const documentId = parseDocumentId(req.params.id);

    if (!documentId) {
      return res.status(400).json({ error: "invalid document id" });
    }

    const result = await pool.query(
      `SELECT id, user_id, filename, mime_type, storage_key, source_type, status, uploaded_at, processed_at, deleted_at
       FROM documents
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [documentId, auth.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching document: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const auth = await resolveAuthUser(req);
    const documentId = parseDocumentId(req.params.id);

    if (!documentId) {
      return res.status(400).json({ error: "invalid document id" });
    }

    const result = await pool.query(
      `UPDATE documents
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id, user_id, filename, mime_type, storage_key, source_type, status, uploaded_at, processed_at, deleted_at`,
      [documentId, auth.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error soft deleting document: ", err);
    res.status(500).json({ error: "database error" });
  }
});

router.patch("/:id/status", internalApiAuth, async (req, res) => {
  try {
    const documentId = parseDocumentId(req.params.id);
    const status = String(req.body.status || "");
    const processedAt = req.body.processed_at ? new Date(req.body.processed_at) : null;

    if (!documentId) {
      return res.status(400).json({ error: "invalid document id" });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ error: "invalid status" });
    }

    if (processedAt && Number.isNaN(processedAt.getTime())) {
      return res.status(400).json({ error: "invalid processed_at" });
    }

    const result = await pool.query(
      `UPDATE documents
       SET status = $2::document_status,
           processed_at = CASE
             WHEN $3::timestamp IS NOT NULL THEN $3::timestamp
             WHEN $2::document_status = 'ready' THEN NOW()
             ELSE processed_at
           END
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, user_id, filename, mime_type, storage_key, source_type, status, uploaded_at, processed_at, deleted_at`,
      [documentId, status, processedAt ? processedAt.toISOString() : null],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating document status: ", err);
    res.status(500).json({ error: "database error" });
  }
});

export default router;
