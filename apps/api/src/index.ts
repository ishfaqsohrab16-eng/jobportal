import { config } from "./config";
import { createApp } from "./app";
import { connectDb, disconnectDb } from "./db";
import { ensureAdmin } from "./services/bootstrap";

async function main() {
  await connectDb();
  await ensureAdmin();
  const server = createApp().listen(config.PORT, () => {
    console.log(`DigiBizz Jobs API listening on :${config.PORT} (${config.NODE_ENV})`);
  });

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDb().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
