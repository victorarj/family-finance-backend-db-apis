const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

function normalizeBaseUrl() {
  return AI_SERVICE_URL ? AI_SERVICE_URL.replace(/\/+$/, "") : null;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function query({ question, userId, documentIds }) {
  const baseUrl = normalizeBaseUrl();

  if (!baseUrl) {
    throw new Error("AI_SERVICE_URL is not configured");
  }

  // TODO: Python service should implement POST /query and return the final AI answer payload.
  const response = await fetch(`${baseUrl}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      user_id: String(userId),
      document_ids: (documentIds || []).map((documentId) => String(documentId)),
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await parseResponse(response),
    contentType: response.headers.get("content-type") || "application/json",
  };
}
