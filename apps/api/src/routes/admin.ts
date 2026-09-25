import crypto from "node:crypto";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import {
  apiKeyCreateSchema,
  APPLICATION_STATUSES,
  applicationStatusSchema,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  opportunitySchema,
  type AdminOverview,
  type ApplicationStatus,
  type OpportunityType,
} from "@digibizz/jobs-shared";
import { currentUser, requireAuth, requireRole } from "../lib/auth";
import { body, conflict, escapeRegex, notFound, objectIdParam, query } from "../lib/http";
import { RESUME_DIR, sendStoredFile } from "../lib/uploads";
import { ApiKeyModel, ApiUsageModel, ApplicationModel, OpportunityModel, UserModel } from "../models";
import { toApiKeyDTO, toApplicationDTO, toOpportunityDTO, toUserDTO } from "../serializers";
import { hashApiKey } from "../partner/auth";
import { inputToDoc, searchFilter, startOfTodayUTC, uniqueSlug } from "../services/opportunities";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const paginate = <T>(items: T[], p: number, l: number, total: number) => ({
  items,
  page: p,
  limit: l,
  total,
  totalPages: Math.max(1, Math.ceil(total / l)),
});

/* -------------------------------------------------------------- overview */

adminRouter.get("/overview", async (_req, res) => {
  const today = startOfTodayUTC();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  const [byTypeStatus, closing, appsTotal, apps7, byStatus, bySource, candidates, usage, daily, recent] = await Promise.all([
    OpportunityModel.aggregate<{ _id: { type: OpportunityType; status: string }; n: number }>([
      { $group: { _id: { type: "$type", status: "$status" }, n: { $sum: 1 } } },
    ]),
    OpportunityModel.countDocuments({ status: "open", deadline: { $gte: today, $lte: new Date(today.getTime() + 7 * 86_400_000) } }),
    ApplicationModel.countDocuments(),
    ApplicationModel.countDocuments({ createdAt: { $gte: weekAgo } }),
    ApplicationModel.aggregate<{ _id: ApplicationStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ApplicationModel.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$source", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 6 },
    ]),
    UserModel.countDocuments({ role: "candidate" }),
    ApiUsageModel.aggregate<{ n: number }>([
      { $match: { day: { $gte: monthAgo.toISOString().slice(0, 10) } } },
      { $group: { _id: null, n: { $sum: "$count" } } },
    ]),
    ApplicationModel.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: new Date(today.getTime() - 13 * 86_400_000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]),
    ApplicationModel.find().sort({ createdAt: -1 }).limit(8).populate("opportunity").populate("user"),
  ]);

  const byType = Object.fromEntries(OPPORTUNITY_TYPES.map((t) => [t, 0])) as Record<OpportunityType, number>;
  let open = 0;
  let draft = 0;
  let total = 0;
  for (const row of byTypeStatus) {
    total += row.n;
    if (row._id.status === "open") {
      open += row.n;
      byType[row._id.type] += row.n;
    }
    if (row._id.status === "draft") draft += row.n;
  }
  const dailyMap = new Map(daily.map((d) => [d._id, d.n]));
  const overview: AdminOverview = {
    opportunities: { total, open, draft, closingThisWeek: closing, byType },
    applications: {
      total: appsTotal,
      last7Days: apps7,
      byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.n])),
      bySource: bySource.map((r) => ({ source: r._id, count: r.n })),
    },
    candidates,
    partnerRequests30d: usage[0]?.n ?? 0,
    daily: Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today.getTime() - (13 - i) * 86_400_000).toISOString().slice(0, 10);
      return { date, applications: dailyMap.get(date) ?? 0 };
    }),
    recent: recent.map((a) => toApplicationDTO(a, { withCandidate: true })),
  };
  res.json(overview);
});

/* --------------------------------------------------------- opportunities */

const adminOppQuery = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  page,
  limit,
});

adminRouter.get("/opportunities", async (req, res) => {
  const q = query(req, adminOppQuery);
  const filter = {
    ...searchFilter(q.q),
    ...(q.type ? { type: q.type } : {}),
    ...(q.status ? { status: q.status } : {}),
  };
  const [docs, total] = await Promise.all([
    OpportunityModel.find(filter).sort({ updatedAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    OpportunityModel.countDocuments(filter),
  ]);
  res.json(paginate(docs.map((d) => toOpportunityDTO(d)), q.page, q.limit, total));
});

adminRouter.get("/opportunities/:id", async (req, res) => {
  const doc = await OpportunityModel.findById(objectIdParam(req));
  if (!doc) throw notFound("Opportunity");
  res.json(toOpportunityDTO(doc));
});

adminRouter.post("/opportunities", async (req, res) => {
  const input = body(req, opportunitySchema);
  const doc = await OpportunityModel.create({
    ...inputToDoc(input),
    slug: await uniqueSlug(OpportunityModel, input.title),
    publishedAt: input.status === "open" ? new Date() : null,
    createdBy: currentUser(req)._id,
  });
  res.status(201).json(toOpportunityDTO(doc));
});

adminRouter.put("/opportunities/:id", async (req, res) => {
  const input = body(req, opportunitySchema);
  const doc = await OpportunityModel.findById(objectIdParam(req));
  if (!doc) throw notFound("Opportunity");
  doc.set(inputToDoc(input));
  if (input.status === "open" && !doc.publishedAt) doc.publishedAt = new Date();
  await doc.save();
  res.json(toOpportunityDTO(doc));
});

adminRouter.patch("/opportunities/:id/status", async (req, res) => {
  const { status } = body(req, z.object({ status: z.enum(OPPORTUNITY_STATUSES) }));
  const doc = await OpportunityModel.findById(objectIdParam(req));
  if (!doc) throw notFound("Opportunity");
  doc.status = status;
  if (status === "open" && !doc.publishedAt) doc.publishedAt = new Date();
  await doc.save();
  res.json(toOpportunityDTO(doc));
});

adminRouter.post("/opportunities/:id/duplicate", async (req, res) => {
  const src = await OpportunityModel.findById(objectIdParam(req)).lean();
  if (!src) throw notFound("Opportunity");
  const { _id, slug: _s, createdAt: _c, updatedAt: _u, ...rest } = src as typeof src & { createdAt: Date; updatedAt: Date };
  const doc = await OpportunityModel.create({
    ...rest,
    title: `${src.title} (copy)`,
    slug: await uniqueSlug(OpportunityModel, src.title),
    status: "draft",
    featured: false,
    views: 0,
    applicationsCount: 0,
    publishedAt: null,
    createdBy: currentUser(req)._id,
  });
  res.status(201).json(toOpportunityDTO(doc));
});

adminRouter.delete("/opportunities/:id", async (req, res) => {
  const id = objectIdParam(req);
  if (await ApplicationModel.exists({ opportunity: id })) {
    throw conflict("This opportunity has applications. Close it instead of deleting it.");
  }
  const result = await OpportunityModel.deleteOne({ _id: id });
  if (!result.deletedCount) throw notFound("Opportunity");
  res.status(204).end();
});

/* ---------------------------------------------------------- applications */

const appQuery = z.object({
  opportunity: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  source: z.string().trim().max(40).optional(),
  q: z.string().trim().max(100).optional(),
  page,
  limit,
});

adminRouter.get("/applications", async (req, res) => {
  const q = query(req, appQuery);
  const filter: Record<string, unknown> = {};
  if (q.opportunity) filter.opportunity = q.opportunity;
  if (q.status) filter.status = q.status;
  if (q.source) filter.source = q.source;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    const users = await UserModel.find({ $or: [{ name: rx }, { email: rx }] }).select("_id").limit(500);
    filter.user = { $in: users.map((u) => u._id) };
  }
  const [docs, total] = await Promise.all([
    ApplicationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("opportunity")
      .populate("user"),
    ApplicationModel.countDocuments(filter),
  ]);
  res.json(paginate(docs.map((a) => toApplicationDTO(a, { withCandidate: true })), q.page, q.limit, total));
});

adminRouter.patch("/applications/:id/status", async (req, res) => {
  const input = body(req, applicationStatusSchema);
  const app = await ApplicationModel.findById(objectIdParam(req));
  if (!app) throw notFound("Application");
  app.status = input.status;
  app.history.push({ status: input.status, note: input.note, at: new Date(), by: currentUser(req)._id });
  await app.save();
  await app.populate(["opportunity", "user"]);
  res.json(toApplicationDTO(app, { withCandidate: true }));
});

adminRouter.get("/applications/:id/resume", async (req, res, next) => {
  const app = await ApplicationModel.findById(objectIdParam(req)).populate("user");
  if (!app?.resume) throw notFound("Resume");
  const name = (app.user as unknown as { name?: string })?.name ?? "candidate";
  const ext = path.extname(app.resume.storedName);
  sendStoredFile(res, next, RESUME_DIR, app.resume.storedName, `${name.replace(/[^\w -]/g, "")} - resume${ext}`);
});

/* ------------------------------------------------------------ candidates */

adminRouter.get("/candidates", async (req, res) => {
  const q = query(req, z.object({ q: z.string().trim().max(100).optional(), page, limit }));
  const rx = q.q ? new RegExp(escapeRegex(q.q), "i") : null;
  const filter = { role: "candidate", ...(rx ? { $or: [{ name: rx }, { email: rx }, { skills: rx }, { city: rx }] } : {}) };
  const [docs, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    UserModel.countDocuments(filter),
  ]);
  res.json(paginate(docs.map(toUserDTO), q.page, q.limit, total));
});

/* -------------------------------------------------------------- api keys */

adminRouter.get("/api-keys", async (_req, res) => {
  const keys = await ApiKeyModel.find().sort({ revokedAt: 1, createdAt: -1 });
  res.json(keys.map(toApiKeyDTO));
});

adminRouter.post("/api-keys", async (req, res) => {
  const input = body(req, apiKeyCreateSchema);
  const secret = `dbz_live_${crypto.randomBytes(24).toString("base64url")}`;
  const key = await ApiKeyModel.create({
    ...input,
    prefix: secret.slice(0, 13),
    hash: hashApiKey(secret),
    createdBy: currentUser(req)._id,
  });
  // The only time the full key is ever returned.
  res.status(201).json({ key: toApiKeyDTO(key), secret });
});

adminRouter.post("/api-keys/:id/revoke", async (req, res) => {
  const key = await ApiKeyModel.findById(objectIdParam(req));
  if (!key) throw notFound("API key");
  key.revokedAt ??= new Date();
  await key.save();
  res.json(toApiKeyDTO(key));
});

adminRouter.get("/api-keys/:id/usage", async (req, res) => {
  const id = objectIdParam(req);
  const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const rows = await ApiUsageModel.find({ key: id, day: { $gte: since } }).sort({ day: 1 });
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const today = startOfTodayUTC().getTime();
  res.json(
    Array.from({ length: 30 }, (_, i) => {
      const day = new Date(today - (29 - i) * 86_400_000).toISOString().slice(0, 10);
      return { day, count: byDay.get(day) ?? 0 };
    }),
  );
});
