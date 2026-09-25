import { Router, type Request } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoose, { type FilterQuery } from "mongoose";
import { z } from "zod";
import { partnerQuerySchema, type OpportunityType, type PartnerScope } from "@digibizz/jobs-shared";
import { config } from "../config";
import { escapeRegex, HttpError, notFound, query } from "../lib/http";
import { OpportunityModel, type Opportunity, type OpportunityDoc } from "../models";
import { startOfTodayUTC } from "../services/opportunities";
import { partnerAuth, requireScope } from "./auth";
import { buildOpenApi } from "./openapi";
import { toPartnerInternship, toPartnerJob, toPartnerLearning } from "./serialize";

export const partnerRouter = Router();

partnerRouter.use(
  cors({ origin: "*", methods: ["GET", "OPTIONS"], allowedHeaders: ["X-API-Key", "Authorization", "Content-Type"] }),
);

partnerRouter.get("/openapi.json", (_req, res) => {
  res.json(buildOpenApi());
});

partnerRouter.use(partnerAuth);
partnerRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => String(req.apiKey?._id),
    message: { error: { code: "rate_limited", message: "Rate limit exceeded: 240 requests per minute per key" } },
  }),
);

interface Collection {
  scope: PartnerScope;
  type: OpportunityType;
  serialize: (o: OpportunityDoc, partnerSlug: string) => object;
  /** Jobs are IT-only by agreement with IndusTech; the rest can opt in with ?it_only=true. */
  itOnly: "always" | "optional";
}

const COLLECTIONS: Collection[] = [
  { scope: "jobs", type: "job", serialize: toPartnerJob, itOnly: "always" },
  { scope: "internships", type: "internship", serialize: toPartnerInternship, itOnly: "optional" },
  { scope: "programs", type: "program", serialize: toPartnerLearning, itOnly: "optional" },
  { scope: "trainings", type: "training", serialize: toPartnerLearning, itOnly: "optional" },
];

const listQuery = partnerQuerySchema.extend({
  it_only: z.enum(["true", "false"]).optional(),
});

function statusFilter(status: z.output<typeof listQuery>["status"]): FilterQuery<Opportunity> {
  const today = startOfTodayUTC();
  switch (status) {
    case "open":
      return { status: "open", $or: [{ deadline: null }, { deadline: { $gte: today } }] };
    case "expired":
      return { status: "open", deadline: { $lt: today } };
    case "closed":
      return { status: "closed" };
    default:
      return { status: { $in: ["open", "closed"] } };
  }
}

function pageLink(req: Request, page: number) {
  const url = new URL(`${config.publicWebUrl}/api/partner/v1${req.path === "/" ? "" : req.path}`);
  for (const [k, v] of Object.entries(req.query)) if (typeof v === "string") url.searchParams.set(k, v);
  url.searchParams.set("page", String(page));
  return url.toString();
}

partnerRouter.get("/", (req, res) => {
  const scopes = req.apiKey!.scopes;
  res.json({
    name: "DigiBizz Jobs Partner API",
    version: "v1",
    partner: req.apiKey!.partnerSlug,
    endpoints: COLLECTIONS.filter((c) => scopes.includes(c.scope)).map((c) => ({
      collection: c.scope,
      list: `${config.publicWebUrl}/api/partner/v1/${c.scope}`,
      item: `${config.publicWebUrl}/api/partner/v1/${c.scope}/{id}`,
    })),
    docs: `${config.publicWebUrl}/developers`,
    openapi: `${config.publicWebUrl}/api/partner/v1/openapi.json`,
  });
});

for (const c of COLLECTIONS) {
  partnerRouter.get(`/${c.scope}`, requireScope(c.scope), async (req, res) => {
    const q = query(req, listQuery);
    const and: FilterQuery<Opportunity>[] = [{ type: c.type }, statusFilter(q.status)];
    if (c.itOnly === "always" || q.it_only === "true") and.push({ isITRelated: true });
    if (q.city) and.push({ city: new RegExp(`^${escapeRegex(q.city)}$`, "i") });
    if (q.updated_since) and.push({ updatedAt: { $gte: new Date(q.updated_since) } });
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), "i");
      and.push({ $or: [{ title: rx }, { skills: rx }, { field: rx }] });
    }
    const filter = { $and: and };
    const [docs, total] = await Promise.all([
      OpportunityModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      OpportunityModel.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / q.limit));
    res.set("Cache-Control", "private, max-age=60");
    res.json({
      data: docs.map((d) => c.serialize(d, req.apiKey!.partnerSlug)),
      meta: {
        collection: c.scope,
        page: q.page,
        limit: q.limit,
        total,
        total_pages: totalPages,
        generated_at: new Date().toISOString(),
      },
      links: {
        self: pageLink(req, q.page),
        next: q.page < totalPages ? pageLink(req, q.page + 1) : null,
        prev: q.page > 1 ? pageLink(req, q.page - 1) : null,
      },
    });
  });

  partnerRouter.get(`/${c.scope}/:id`, requireScope(c.scope), async (req, res) => {
    const id = String(req.params.id);
    const doc = await OpportunityModel.findOne({
      type: c.type,
      status: { $in: ["open", "closed"] },
      ...(c.itOnly === "always" ? { isITRelated: true } : {}),
      ...(mongoose.isValidObjectId(id) ? { _id: id } : { slug: id }),
    });
    if (!doc) throw notFound(c.type[0]!.toUpperCase() + c.type.slice(1));
    res.json({ data: c.serialize(doc, req.apiKey!.partnerSlug) });
  });
}

partnerRouter.use((req, _res, next) => {
  next(new HttpError(404, "not_found", `Unknown endpoint ${req.path}. See /api/partner/v1 for the list.`));
});
