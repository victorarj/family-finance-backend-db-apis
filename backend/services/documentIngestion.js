const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

function normalizeBaseUrl() {
  return AI_SERVICE_URL ? AI_SERVICE_URL.replace(/\/+$/, "") : null;
}

export function isAiIngestionConfigured() {
  return Boolean(normalizeBaseUrl());
}

export async function requestDocumentIngestion({ documentId, userId, storageKey, sourceType }) {
  const baseUrl = normalizeBaseUrl();

  if (!baseUrl) {
    return false;
  }

  const response = await fetch(`${baseUrl}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: String(documentId),
      user_id: String(userId),
      storage_key: storageKey,
      source_type: sourceType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI ingestion request failed with ${response.status}: ${body}`);
  }

  return true;
}
