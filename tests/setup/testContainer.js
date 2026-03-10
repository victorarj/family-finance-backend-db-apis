import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { applySqlFile } from "./dbBootstrap.js";
import { resetDatabase as doResetDatabase } from "./dbReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

let started = false;
let container;
let adminPool;
let dbPool;
let app;

export async function ensureTestEnvironment() {
  if (started) {
    return { app, adminPool, dbPool };
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

  container = await new PostgreSqlContainer("postgres:16").start();
  process.env.POSTGRES_USER = container.getUsername();
  process.env.POSTGRES_PASSWORD = container.getPassword();
  process.env.POSTGRES_DB = container.getDatabase();
  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getPort());

  adminPool = new Pool({ connectionString: container.getConnectionUri() });
  await applySqlFile(adminPool, path.resolve(projectRoot, "postgres-init/init.sql"));
  await applySqlFile(
    adminPool,
    path.resolve(projectRoot, "postgres-init/migrations/001_extend_schema_planning.sql"),
  );
  await applySqlFile(
    adminPool,
    path.resolve(projectRoot, "postgres-init/migrations/002_bank_accounts_management.sql"),
  );

  const appModule = await import("../../backend/app.js");
  app = appModule.createApp();

  const dbModule = await import("../../backend/db.js");
  dbPool = dbModule.default;

  started = true;
  return { app, adminPool, dbPool };
}

export async function resetDatabase() {
  if (!started) {
    await ensureTestEnvironment();
  }
  await doResetDatabase(adminPool);
}

export async function shutdownTestEnvironment() {
  if (!started) return;
  await dbPool?.end();
  await adminPool?.end();
  await container?.stop();
  started = false;
  container = null;
  adminPool = null;
  dbPool = null;
  app = null;
}
