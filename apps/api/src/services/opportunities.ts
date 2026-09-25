import crypto from "node:crypto";
import type { FilterQuery, Model, SortOrder } from "mongoose";
import { slugify, type OpportunityData, type OpportunityQuery } from "@digibizz/jobs-shared";
import { z } from "zod";
import { opportunityQuerySchema } from "@digibizz/jobs-shared";
import type { Opportunity, OrganizationDoc } from "../models";
import { escapeRegex } from "../lib/http";

export const startOfTodayUTC = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/** Published, and the deadline (if any) has not passed. */
export const liveFilter = (): FilterQuery<Opportunity> => ({
  status: "open",
  $or: [{ deadline: null }, { deadline: { $gte: startOfTodayUTC() } }],
});

export function searchFilter(q: string | undefined): FilterQuery<Opportunity> {
  if (!q) return {};
  const rx = new RegExp(escapeRegex(q), "i");
  return { $or: [{ title: rx }, { organizationName: rx }, { skills: rx }, { field: rx }, { city: rx }, { summary: rx }] };
}

type ListQuery = z.output<typeof opportunityQuerySchema>;

export function buildListFilter(q: ListQuery, base: FilterQuery<Opportunity>): FilterQuery<Opportunity> {
  const and: FilterQuery<Opportunity>[] = [base];
  if (q.q) and.push(searchFilter(q.q));
  if (q.type) and.push({ type: q.type });
  if (q.category) and.push({ category: q.category });
  if (q.city) and.push({ city: new RegExp(`^${escapeRegex(q.city)}$`, "i") });
  if (q.workMode) and.push({ workMode: q.workMode });
  if (q.employmentType) and.push({ employmentType: q.employmentType });
  if (q.field) and.push({ field: q.field });
  if (q.organization) and.push({ organizationName: new RegExp(escapeRegex(q.organization), "i") });
  if (q.it) and.push({ isITRelated: q.it === "1" });
  if (q.featured) and.push({ featured: true });
  if (q.closingSoon) {
    const today = startOfTodayUTC();
    and.push({ deadline: { $gte: today, $lte: new Date(today.getTime() + 7 * 86_400_000) } });
  }
  return and.length === 1 ? base : { $and: and };
}

export function sortFor(sort: ListQuery["sort"]): Record<string, SortOrder> {
  switch (sort) {
    case "deadline":
      return { deadline: 1, _id: -1 };
    case "salary":
      return { salaryMax: -1, salaryMin: -1, _id: -1 };
    default:
      return { featured: -1, publishedAt: -1, _id: -1 };
  }
}

export type { OpportunityQuery };

export async function uniqueSlug(model: Model<any>, source: string, ignoreId?: string): Promise<string> {
  const base = slugify(source) || "item";
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${crypto.randomBytes(3).toString("hex")}`;
    const clash = await model.exists({ slug: candidate, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });
    if (!clash) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const toDate = (d: string | null | undefined) => (d ? new Date(`${d}T00:00:00.000Z`) : null);

/** Map validated form input onto the stored document shape. */
export function inputToDoc(data: OpportunityData, org: OrganizationDoc) {
  const { organizationId: _drop, startDate, deadline, ...rest } = data;
  return {
    ...rest,
    employmentType: data.type === "job" || data.type === "internship" ? (data.employmentType ?? null) : null,
    organization: org._id,
    organizationName: org.name,
    startDate: toDate(startDate),
    deadline: toDate(deadline),
  };
}
