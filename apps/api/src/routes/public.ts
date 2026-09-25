import { Router } from "express";
import {
  OPPORTUNITY_TYPES,
  opportunityQuerySchema,
  type OpportunityType,
  type Paginated,
  type OpportunityDTO,
  type PublicStats,
} from "@digibizz/jobs-shared";
import { optionalAuth } from "../lib/auth";
import { notFound, query } from "../lib/http";
import { ApplicationModel, OpportunityModel } from "../models";
import { toOpportunityDTO } from "../serializers";
import { buildListFilter, liveFilter, sortFor } from "../services/opportunities";

export const publicRouter = Router();

publicRouter.get("/opportunities", async (req, res) => {
  const q = query(req, opportunityQuerySchema);
  const filter = buildListFilter(q, liveFilter());
  const [docs, total] = await Promise.all([
    OpportunityModel.find(filter)
      .sort(sortFor(q.sort))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    OpportunityModel.countDocuments(filter),
  ]);
  const body: Paginated<OpportunityDTO> = {
    items: docs.map((d) => toOpportunityDTO(d)),
    page: q.page,
    limit: q.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.limit)),
  };
  res.json(body);
});

publicRouter.get("/opportunities/:slug", optionalAuth, async (req, res) => {
  const doc = await OpportunityModel.findOne({ slug: req.params.slug });
  const isAdmin = req.user?.role === "admin";
  if (!doc || (doc.status === "draft" && !isAdmin)) throw notFound("Opportunity");

  if (!isAdmin) await OpportunityModel.updateOne({ _id: doc._id }, { $inc: { views: 1 } });

  let viewer: OpportunityDTO["viewer"];
  if (req.user) {
    const app = await ApplicationModel.findOne({ opportunity: doc._id, user: req.user._id }).select("status");
    viewer = {
      saved: req.user.saved.some((id) => id.equals(doc._id)),
      applicationStatus: app?.status ?? null,
    };
  }
  res.json(toOpportunityDTO(doc, viewer));
});

publicRouter.get("/opportunities/:slug/similar", async (req, res) => {
  const doc = await OpportunityModel.findOne({ slug: req.params.slug }).select("type field _id");
  if (!doc) throw notFound("Opportunity");
  const docs = await OpportunityModel.find({
    $and: [liveFilter(), { _id: { $ne: doc._id }, type: doc.type }],
  })
    .sort({ field: doc.field ? -1 : 1, publishedAt: -1 })
    .limit(20);
  // Prefer the same field, then fill with the newest of the same type.
  const ranked = [...docs.filter((d) => d.field === doc.field), ...docs.filter((d) => d.field !== doc.field)];
  res.json(ranked.slice(0, 4).map((d) => toOpportunityDTO(d)));
});

publicRouter.get("/stats", async (_req, res) => {
  const [byType, cities, it] = await Promise.all([
    OpportunityModel.aggregate<{ _id: OpportunityType; n: number }>([
      { $match: liveFilter() },
      { $group: { _id: "$type", n: { $sum: "$positions" } } },
    ]),
    OpportunityModel.distinct("city", liveFilter()),
    OpportunityModel.aggregate<{ _id: boolean; n: number }>([
      { $match: liveFilter() },
      { $group: { _id: "$isITRelated", n: { $sum: 1 } } },
    ]),
  ]);
  const open = Object.fromEntries(OPPORTUNITY_TYPES.map((t) => [t, 0])) as Record<OpportunityType, number>;
  for (const row of byType) open[row._id] = row.n;
  const itCount = it.find((r) => r._id)?.n ?? 0;
  const all = it.reduce((s, r) => s + r.n, 0);
  const stats: PublicStats = {
    open,
    cities: cities.filter(Boolean).length,
    itShare: all ? Math.round((itCount / all) * 100) : 0,
  };
  res.json(stats);
});

/** Values that actually exist in live listings, with counts - drives the filter panel. */
publicRouter.get("/facets", async (req, res) => {
  const type = OPPORTUNITY_TYPES.find((t) => t === req.query.type);
  const match = type ? { $and: [liveFilter(), { type }] } : liveFilter();
  const facet = (field: string) => [
    { $match: { [field]: { $nin: ["", null] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 as const, _id: 1 as const } },
    { $limit: 30 },
    { $project: { _id: 0, value: "$_id", count: 1 } },
  ];
  const [result] = await OpportunityModel.aggregate([
    { $match: match },
    { $facet: { cities: facet("city"), fields: facet("field"), workModes: facet("workMode") } },
  ]);
  res.json(result);
});
