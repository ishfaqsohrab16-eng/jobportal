import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./lib/http";
import { ensureUploadDirs, LOGO_DIR } from "./lib/uploads";
import { partnerRouter } from "./partner/router";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { publicRouter } from "./routes/public";

export function createApp() {
  ensureUploadDirs();
  const app = express();
  app.set("trust proxy", config.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(compression());
  if (!config.isTest) app.use(morgan(config.isProd ? "combined" : "dev"));

  app.get("/api/health", (_req, res) => {
    const up = mongoose.connection.readyState === 1;
    res.status(up ? 200 : 503).json({ status: up ? "ok" : "degraded", db: up ? "up" : "down", time: new Date().toISOString() });
  });

  // Partner API: its own CORS policy (any origin, key-authenticated) and no cookies.
  app.use("/api/partner/v1", partnerRouter);

  app.use("/api", cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  app.use(
    "/api/files/logos",
    express.static(LOGO_DIR, { maxAge: "7d", immutable: true, fallthrough: false, index: false }),
  );
  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);

  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
