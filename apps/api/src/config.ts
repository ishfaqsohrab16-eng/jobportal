import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().default(4000),
    /** A mongodb:// URI, or "memory" to run an embedded mongod for local development. */
    MONGODB_URI: z.string().min(1).default("memory"),
    JWT_SECRET: z.string().min(1).default("dev-only-secret-change-me-dev-only-secret"),
    JWT_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    /** Public URL of the web app. Partner apply links are built from it. */
    PUBLIC_WEB_URL: z.url().default("http://localhost:5173"),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
    COOKIE_SECURE: bool.optional(),
    UPLOAD_DIR: z.string().default("./uploads"),
    /** Built web app (apps/web/dist). When set and present, the API also serves the site - one service. */
    WEB_DIST_DIR: z.string().optional(),
    ADMIN_NAME: z.string().default("DigiBizz Admin"),
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),

    /* Email (Brevo). Without BREVO_API_KEY the app runs normally and simply sends nothing. */
    BREVO_API_KEY: z.string().trim().min(1).optional(),
    BREVO_SENDER_EMAIL: z.email().default("noreply@digibizz.gob.pk"),
    BREVO_SENDER_NAME: z.string().default("DigiBizz Balochistan"),
    BREVO_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
    /** Where replies to our emails should go. Defaults to no reply-to header. */
    BREVO_REPLY_TO: z.email().optional(),
    /** Who gets "new application" alerts. Defaults to ADMIN_EMAIL; set to "off" to disable. */
    ADMIN_NOTIFY_EMAIL: z.string().trim().optional(),
    /** How long a password-reset link stays valid. */
    RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(1_440).default(60),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith("dev-only")) {
        ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "Set a random JWT_SECRET of 32+ characters in production" });
      }
      if (env.MONGODB_URI === "memory") {
        ctx.addIssue({ code: "custom", path: ["MONGODB_URI"], message: "The embedded database is for development only" });
      }
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  ...env,
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === "production",
  corsOrigins: [...env.CORS_ORIGINS.split(","), env.PUBLIC_WEB_URL].map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean),
  publicWebUrl: env.PUBLIC_WEB_URL.replace(/\/+$/, ""),
  uploadDir: path.resolve(env.UPLOAD_DIR),
  webDistDir: env.WEB_DIST_DIR ? path.resolve(env.WEB_DIST_DIR) : null,
  adminNotifyEmail:
    env.ADMIN_NOTIFY_EMAIL === "off" ? null : (env.ADMIN_NOTIFY_EMAIL || env.ADMIN_EMAIL || null),
};
