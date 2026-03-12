import { Client as MinioClient } from "minio";

function normalizeEndpoint(rawEndpoint) {
  const value = (rawEndpoint || "http://localhost:9000").trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value);
  }
  return new URL(`http://${value}`);
}

const endpoint = normalizeEndpoint(process.env.MINIO_ENDPOINT);
const bucket = process.env.MINIO_BUCKET || "documents";

const client = new MinioClient({
  endPoint: endpoint.hostname,
  port: endpoint.port ? Number.parseInt(endpoint.port, 10) : endpoint.protocol === "https:" ? 443 : 80,
  useSSL: endpoint.protocol === "https:",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

let bucketReadyPromise;

async function ensureBucketExists() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const exists = await client.bucketExists(bucket);
      if (!exists) {
        await client.makeBucket(bucket);
      }
    })().catch((error) => {
      bucketReadyPromise = undefined;
      throw error;
    });
  }

  return bucketReadyPromise;
}

export async function uploadDocumentObject({ storageKey, body, contentType }) {
  await ensureBucketExists();
  await client.putObject(bucket, storageKey, body, body.length, {
    "Content-Type": contentType,
  });
}

export async function deleteDocumentObject(storageKey) {
  try {
    await client.removeObject(bucket, storageKey);
  } catch (error) {
    if (error?.code !== "NoSuchKey") {
      throw error;
    }
  }
}
