DROP INDEX IF EXISTS idx_document_chunks_embedding_ivfflat;
DROP INDEX IF EXISTS idx_document_chunks_user_document;
DROP INDEX IF EXISTS idx_document_chunks_document;
DROP INDEX IF EXISTS idx_documents_user_status;
DROP INDEX IF EXISTS idx_documents_user_uploaded;

DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;

DROP TYPE IF EXISTS document_status;
DROP TYPE IF EXISTS document_source_type;
