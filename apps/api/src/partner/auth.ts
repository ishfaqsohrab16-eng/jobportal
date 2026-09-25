import crypto from "node:crypto";
import type { RequestHandler } from "express";
import type { PartnerScope } from "@digibizz/jobs-shared";
import { HttpError } from "../lib/http";
import { ApiKeyModel, ApiUsageModel, type ApiKeyDoc } from "../models";

declare module "express-serve-static-core" {
  interface Request {
    apiKey?: ApiKeyDoc;
  }
}

export const hashApiKey = (secret: string) => crypto.createHash("sha256").update(secret).digest("hex");

function readKey(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.header("x-api-key");
  if (header) return header.trim();
  const auth = req.header("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

/** Authenticates a partner by API key and records usage once the response is sent. */
export const partnerAuth: RequestHandler = async (req, res, next) => {
  const secret = readKey(req);
  if (!secret) {
    throw new HttpError(401, "missing_api_key", "Send your API key in the X-API-Key header");
  }
  const key = await ApiKeyModel.findOne({ hash: hashApiKey(secret) });
  if (!key || key.revokedAt) throw new HttpError(401, "invalid_api_key", "This API key is invalid or has been revoked");
  req.apiKey = key;

  res.on("finish", () => {
    if (res.statusCode >= 500) return;
    const day = new Date().toISOString().slice(0, 10);
    void Promise.all([
      ApiKeyModel.updateOne({ _id: key._id }, { $inc: { requestCount: 1 }, $set: { lastUsedAt: new Date() } }),
      ApiUsageModel.updateOne({ key: key._id, day }, { $inc: { count: 1 } }, { upsert: true }),
    ]).catch((err) => console.error("Failed to record API usage", err));
  });
  next();
};

export const requireScope =
  (scope: PartnerScope): RequestHandler =>
  (req, _res, next) => {
    if (!req.apiKey?.scopes.includes(scope)) {
      throw new HttpError(403, "scope_denied", `This API key does not have access to ${scope}`);
    }
    next();
  };
