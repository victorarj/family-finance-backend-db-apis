import { ensureTestEnvironment } from "./testContainer.js";

export async function getTestApp() {
  const { app } = await ensureTestEnvironment();
  return app;
}
