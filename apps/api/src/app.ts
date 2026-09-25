import fs from "node:fs";
import path from "node:path";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./lib/http";
import { ensureUploadDirs } from "./lib/uploads";
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

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          // The Rive mascot runs on WebAssembly and draws images from blob: URLs.
          "script-src": ["'self'", "'wasm-unsafe-eval'"],
          "img-src": ["'self'", "data:", "blob:"],
          "connect-src": ["'self'"],
          "worker-src": ["'self'", "blob:"],
          "upgrade-insecure-requests": config.isProd ? [] : null,
        },
      },
    }),
  );
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

  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);

  app.use("/api", notFoundHandler);

  // Single-service deployment: the same server hosts the built web app.
  const webDist = config.webDistDir;
  if (webDist && fs.existsSync(path.join(webDist, "index.html"))) {
    const indexHtml = path.join(webDist, "index.html");
    app.use(
      express.static(webDist, {
        index: false,
        setHeaders(res, file) {
          // Vite fingerprints everything under /assets, so it can be cached forever.
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      }),
    );
    // Client-side routes (/jobs, /admin/...) all load the SPA shell.
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
