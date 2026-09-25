import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "./config";
import { useSharedMongoBinaryCache } from "./lib/mongoBinary";

let stopEmbedded: (() => Promise<unknown>) | null = null;

/**
 * Resolve MONGODB_URI. "memory" starts an embedded mongod (from the
 * mongodb-memory-server dev dependency) whose data lives in ./.data/mongo, so
 * `npm run dev` works on a machine with no MongoDB or Docker installed.
 */
const EMBEDDED_PORT = 27027;

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function resolveUri(): Promise<string> {
  if (config.MONGODB_URI !== "memory") return config.MONGODB_URI;
  // Another process (the dev server, or a seed run) already started it: share that instance.
  if (await portInUse(EMBEDDED_PORT)) return `mongodb://127.0.0.1:${EMBEDDED_PORT}/digibizz_jobs`;
  useSharedMongoBinaryCache();
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const dbPath = path.resolve(".data/mongo");
  fs.mkdirSync(dbPath, { recursive: true });
  const server = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger", port: EMBEDDED_PORT },
  });
  stopEmbedded = () => server.stop({ doCleanup: false });
  console.log(`Embedded MongoDB running (data in ${dbPath})`);
  return server.getUri("digibizz_jobs");
}

export async function connectDb(uri?: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri ?? (await resolveUri()), {
    serverSelectionTimeoutMS: 15_000,
    autoIndex: true,
  });
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  if (stopEmbedded) await stopEmbedded();
}
