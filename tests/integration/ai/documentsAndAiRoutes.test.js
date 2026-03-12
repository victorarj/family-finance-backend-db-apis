import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

vi.mock("../../../backend/services/aiService.js", () => ({
  query: vi.fn(),
}));

vi.mock("../../../backend/services/objectStorage.js", () => ({
  uploadDocumentObject: vi.fn().mockResolvedValue(undefined),
  deleteDocumentObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../backend/services/documentIngestion.js", () => ({
  isAiIngestionConfigured: vi.fn(() => true),
  requestDocumentIngestion: vi.fn().mockResolvedValue(true),
}));

import { getTestApp } from "../../setup/appFactory.js";
import { createAuthenticatedUser } from "../../setup/authFactory.js";
import {
  ensureTestEnvironment,
  resetDatabase,
  shutdownTestEnvironment,
} from "../../setup/testContainer.js";
import { query as queryAiService } from "../../../backend/services/aiService.js";
import { requestDocumentIngestion } from "../../../backend/services/documentIngestion.js";
import { uploadDocumentObject } from "../../../backend/services/objectStorage.js";

describe("documents and ai routes", () => {
  let app;
  let adminPool;

  beforeAll(async function () {
    const environment = await ensureTestEnvironment();
    if (environment.skipReason) {
      this.skip(environment.skipReason);
    }
    app = await getTestApp();
    adminPool = environment.adminPool;
    process.env.INTERNAL_API_SECRET = "test-internal-secret";
    process.env.ADMIN_EMAIL = "admin@example.com";
  }, 120000);

  beforeEach(async () => {
    await resetDatabase();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await shutdownTestEnvironment();
  });

  it("uploads document metadata for supported mime types", async () => {
    const { authHeader } = await createAuthenticatedUser(app);

    const response = await request(app)
      .post("/api/v1/documents/upload")
      .set(authHeader)
      .field("source_type", "bill")
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "statement.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body.document_id).toEqual(expect.any(Number));
    expect(response.body.storage_key).toContain("documents/");
    expect(response.body.document.mime_type).toBe("application/pdf");
    expect(response.body.document.source_type).toBe("bill");
    expect(response.body.document.status).toBe("uploaded");
    expect(response.body.ingestion_requested).toBe(true);
    expect(uploadDocumentObject).toHaveBeenCalledTimes(1);
    expect(requestDocumentIngestion).toHaveBeenCalledWith({
      documentId: response.body.document_id,
      userId: expect.any(Number),
      storageKey: response.body.storage_key,
      sourceType: "bill",
    });
  });

  it("rejects unsupported upload mime types", async () => {
    const { authHeader } = await createAuthenticatedUser(app);

    const response = await request(app)
      .post("/api/v1/documents/upload")
      .set(authHeader)
      .attach("file", Buffer.from("plain text"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("unsupported mime type");
  });

  it("lists paginated documents and excludes soft deleted rows", async () => {
    const { authHeader } = await createAuthenticatedUser(app);

    const first = await request(app)
      .post("/api/v1/documents/upload")
      .set(authHeader)
      .attach("file", Buffer.from("image-1"), {
        filename: "paystub.jpg",
        contentType: "image/jpeg",
      });

    await request(app)
      .post("/api/v1/documents/upload")
      .set(authHeader)
      .attach("file", Buffer.from("image-2"), {
        filename: "invoice.png",
        contentType: "image/png",
      });

    await request(app)
      .delete(`/api/v1/documents/${first.body.document_id}`)
      .set(authHeader);

    const response = await request(app)
      .get("/api/v1/documents?page=1&limit=10")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.items[0].filename).toBe("invoice.png");
  });

  it("returns and soft deletes only owned documents", async () => {
    const owner = await createAuthenticatedUser(app);
    const other = await createAuthenticatedUser(app, { email: "other@example.com" });

    const created = await request(app)
      .post("/api/v1/documents/upload")
      .set(owner.authHeader)
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "contract.pdf",
        contentType: "application/pdf",
      });

    const details = await request(app)
      .get(`/api/v1/documents/${created.body.document_id}`)
      .set(owner.authHeader);
    expect(details.status).toBe(200);

    const forbidden = await request(app)
      .get(`/api/v1/documents/${created.body.document_id}`)
      .set(other.authHeader);
    expect(forbidden.status).toBe(404);

    const deleted = await request(app)
      .delete(`/api/v1/documents/${created.body.document_id}`)
      .set(owner.authHeader);
    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted_at).toBeTruthy();

    const afterDelete = await request(app)
      .get(`/api/v1/documents/${created.body.document_id}`)
      .set(owner.authHeader);
    expect(afterDelete.status).toBe(404);
  });

  it("updates document status only with the internal secret", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    const created = await request(app)
      .post("/api/v1/documents/upload")
      .set(authHeader)
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      });

    const unauthorized = await request(app)
      .patch(`/api/v1/documents/${created.body.document_id}/status`)
      .send({ status: "processing" });
    expect(unauthorized.status).toBe(401);

    const updated = await request(app)
      .patch(`/api/v1/documents/${created.body.document_id}/status`)
      .set("x-internal-api-secret", "test-internal-secret")
      .send({ status: "ready" });

    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("ready");
    expect(updated.body.processed_at).toBeTruthy();
  });

  it("rejects ai queries with inaccessible document ids", async () => {
    const owner = await createAuthenticatedUser(app);
    const other = await createAuthenticatedUser(app, { email: "other@example.com" });

    const created = await request(app)
      .post("/api/v1/documents/upload")
      .set(other.authHeader)
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "secret.pdf",
        contentType: "application/pdf",
      });

    const response = await request(app)
      .post("/api/v1/ai/query")
      .set(owner.authHeader)
      .send({
        question: "What is in this document?",
        document_ids: [created.body.document_id],
      });

    expect(response.status).toBe(403);
  });

  it("proxies successful ai queries through aiService", async () => {
    const { authHeader } = await createAuthenticatedUser(app);
    const created = await request(app)
      .post("/api/v1/documents/upload")
      .set(authHeader)
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "analysis.pdf",
        contentType: "application/pdf",
      });

    queryAiService.mockResolvedValue({
      status: 200,
      contentType: "application/json",
      body: { answer: "Mocked response" },
    });

    const response = await request(app)
      .post("/api/v1/ai/query")
      .set(authHeader)
      .send({
        question: "Summarize the document",
        document_ids: [created.body.document_id],
      });

    expect(response.status).toBe(200);
    expect(response.body.answer).toBe("Mocked response");
    expect(queryAiService).toHaveBeenCalledWith({
      question: "Summarize the document",
      userId: expect.any(Number),
      documentIds: [created.body.document_id],
    });
  });

  it("returns chunks for owners and admins only", async () => {
    const owner = await createAuthenticatedUser(app);
    const other = await createAuthenticatedUser(app, { email: "other@example.com" });

    const created = await request(app)
      .post("/api/v1/documents/upload")
      .set(owner.authHeader)
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "chunked.pdf",
        contentType: "application/pdf",
      });

    await adminPool.query(
      `INSERT INTO document_chunks (document_id, user_id, content, embedding, chunk_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [created.body.document_id, owner.userId, "chunk-1", `[${"0,".repeat(1535)}0]`, 0],
    );

    const ownerResponse = await request(app)
      .get(`/api/v1/ai/documents/${created.body.document_id}/chunks`)
      .set(owner.authHeader);
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body).toHaveLength(1);

    const otherResponse = await request(app)
      .get(`/api/v1/ai/documents/${created.body.document_id}/chunks`)
      .set(other.authHeader);
    expect(otherResponse.status).toBe(403);

    const adminToken = jwt.sign(
      { id: 1, email: "admin@example.com" },
      process.env.JWT_SECRET || "test-jwt-secret",
      { expiresIn: "1h" },
    );

    const adminResponse = await request(app)
      .get(`/api/v1/ai/documents/${created.body.document_id}/chunks`)
      .set({ Authorization: `Bearer ${adminToken}` });
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body).toHaveLength(1);
  });
});
