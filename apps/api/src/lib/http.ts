import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { z, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "bad_request", message, fields);
export const unauthorized = (message = "Please sign in to continue") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You do not have access to this") => new HttpError(403, "forbidden", message);
export const notFound = (what = "Resource") => new HttpError(404, "not_found", `${what} not found`);
export const conflict = (message: string) => new HttpError(409, "conflict", message);

function zodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

export function parse<T extends ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = zodFields(result.error);
    const first = Object.entries(fields)[0];
    throw badRequest(first ? `${first[0]}: ${first[1]}` : "Invalid request", fields);
  }
  return result.data;
}

export const body = <T extends ZodType>(req: Request, schema: T) => parse(schema, req.body);
export const query = <T extends ZodType>(req: Request, schema: T) => parse(schema, req.query);

export function objectIdParam(req: Request, name = "id"): string {
  const v = req.params[name];
  if (typeof v !== "string" || !mongoose.isValidObjectId(v)) throw notFound();
  return v;
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const notFoundHandler: RequestHandler = (req, _res, next) =>
  next(new HttpError(404, "not_found", `No route for ${req.method} ${req.path}`));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
    res.status(400).json({ error: { code: "upload_error", message } });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "bad_json", message: "Request body is not valid JSON" } });
    return;
  }
  if (err?.code === 11000) {
    res.status(409).json({ error: { code: "conflict", message: "That record already exists" } });
    return;
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: { code: "server_error", message: "Something went wrong on our side" } });
};
