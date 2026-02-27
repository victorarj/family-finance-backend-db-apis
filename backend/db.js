import { Pool } from "pg";

import dotenv from "dotenv";
dotenv.config();

const env = process.env;

const pool = new Pool({
  user: env.POSTGRES_USER,
  host: env.DB_HOST || "localhost",
  database: env.POSTGRES_DB,
  password: env.POSTGRES_PASSWORD,
  port: env.DB_PORT ? parseInt(env.DB_PORT, 10) : 5432,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export default pool;
