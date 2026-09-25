import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { RESUME_MAX_BYTES } from "@digibizz/jobs-shared";
import { config } from "../config";
import type { NextFunction, Response } from "express";
import { badRequest, notFound } from "./http";

export const RESUME_DIR = path.join(config.uploadDir, "resumes");

export function ensureUploadDirs() {
  for (const dir of [RESUME_DIR]) fs.mkdirSync(dir, { recursive: true });
}

const RESUME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function uploader(dir: string, types: Record<string, string>, maxBytes: number, label: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${types[file.mimetype]}`),
    }),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (types[file.mimetype]) cb(null, true);
      else cb(badRequest(`${label} must be one of: ${Object.values(types).join(", ")}`));
    },
  });
}

export const resumeUpload = uploader(RESUME_DIR, RESUME_TYPES, RESUME_MAX_BYTES, "Resume").single("resume");

/** Stream a stored file as a download; a missing file is a 404, not a 500. */
export function sendStoredFile(res: Response, next: NextFunction, dir: string, storedName: string, downloadName: string) {
  // The path is built from our own stored name, so dot-folders in UPLOAD_DIR (e.g. ./.data) are fine.
  res.download(path.join(dir, path.basename(storedName)), downloadName, { dotfiles: "allow" }, (err) => {
    if (!err) return;
    if (res.headersSent) return;
    next((err as { status?: number }).status === 404 ? notFound("File") : err);
  });
}

export function removeFile(dir: string, storedName: string | null | undefined) {
  if (!storedName) return;
  fs.promises.unlink(path.join(dir, path.basename(storedName))).catch(() => undefined);
}
