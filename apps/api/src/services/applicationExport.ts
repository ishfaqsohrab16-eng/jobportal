import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import ExcelJS from "exceljs";
import type { Response } from "express";
import type { FilterQuery } from "mongoose";
import { z } from "zod";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_META,
  type ApplicationStatus,
  type OpportunityType,
} from "@digibizz/jobs-shared";
import { escapeRegex } from "../lib/http";
import { RESUME_DIR } from "../lib/uploads";
import { ApplicationModel, OpportunityModel, UserModel, type Application, type ApplicationDoc, type OpportunityDoc, type UserDoc } from "../models";

/** Exports are capped so one click can't pull an unbounded collection into memory. */
export const EXPORT_MAX_ROWS = 10_000;

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const csvOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .optional();

/** Filters shared by the list, the Excel/CSV export and the resume ZIP. */
export const applicationFilterSchema = z.object({
  opportunity: objectId.optional(),
  type: csvOf(OPPORTUNITY_TYPES),
  status: csvOf(APPLICATION_STATUSES),
  source: z.string().trim().max(40).optional(),
  city: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  from: day.optional(),
  to: day.optional(),
  resume: z.enum(["yes", "no"]).optional(),
  minExperience: z.coerce.number().min(0).max(60).optional(),
  sort: z.enum(["newest", "oldest", "updated", "name"]).default("newest"),
});
export type ApplicationFilter = z.output<typeof applicationFilterSchema>;

/**
 * Turn the query into a Mongo filter. Returns null when a sub-lookup already
 * proves nothing can match (e.g. no candidate has that name).
 */
export async function buildApplicationFilter(q: ApplicationFilter): Promise<FilterQuery<Application> | null> {
  const and: FilterQuery<Application>[] = [];
  if (q.opportunity) and.push({ opportunity: q.opportunity });
  if (q.type?.length) {
    const ids = await OpportunityModel.find({ type: { $in: q.type } }).distinct("_id");
    if (!ids.length) return null;
    and.push({ opportunity: { $in: ids } });
  }
  if (q.status?.length) and.push({ status: { $in: q.status } });
  if (q.source) and.push({ source: q.source.toLowerCase() });
  if (q.city) and.push({ city: new RegExp(escapeRegex(q.city), "i") });
  if (q.resume === "yes") and.push({ resume: { $ne: null } });
  if (q.resume === "no") and.push({ resume: null });
  if (q.from || q.to) {
    const createdAt: Record<string, Date> = {};
    if (q.from) createdAt.$gte = new Date(`${q.from}T00:00:00.000Z`);
    if (q.to) createdAt.$lt = new Date(new Date(`${q.to}T00:00:00.000Z`).getTime() + 86_400_000);
    and.push({ createdAt });
  }

  const userConds: FilterQuery<UserDoc>[] = [];
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    userConds.push({ $or: [{ name: rx }, { email: rx }, { phone: rx }, { skills: rx }] });
  }
  if (q.minExperience != null) userConds.push({ experienceYears: { $gte: q.minExperience } });
  if (userConds.length) {
    const ids = await UserModel.find({ $and: userConds }).distinct("_id");
    if (!ids.length) return null;
    and.push({ user: { $in: ids } });
  }
  return and.length ? { $and: and } : {};
}

export const applicationSort = (sort: ApplicationFilter["sort"]): Record<string, 1 | -1> =>
  sort === "oldest" ? { createdAt: 1 } : sort === "updated" ? { updatedAt: -1 } : { createdAt: -1 };

/** Sorting by candidate name happens after populate, since it lives on another collection. */
export function sortByName<T extends ApplicationDoc>(docs: T[]): T[] {
  return docs.sort((a, b) => (candidateOf(a)?.name ?? "").localeCompare(candidateOf(b)?.name ?? ""));
}

const candidateOf = (a: ApplicationDoc) => a.user as unknown as UserDoc | null;
const opportunityOf = (a: ApplicationDoc) => a.opportunity as unknown as OpportunityDoc | null;

export async function findForExport(q: ApplicationFilter) {
  const filter = await buildApplicationFilter(q);
  if (!filter) return [];
  const docs = await ApplicationModel.find(filter)
    .sort(applicationSort(q.sort))
    .limit(EXPORT_MAX_ROWS)
    .populate("opportunity")
    .populate("user");
  return q.sort === "name" ? sortByName(docs) : docs;
}

/* ------------------------------------------------------------- rows */

const safeName = (s: string, max = 60) =>
  s.replace(/[^\p{L}\p{N} ._()-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, max) || "untitled";

/** Path of each resume inside the ZIP, de-duplicated. Also shown in the spreadsheet. */
function resumePaths(docs: ApplicationDoc[]) {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const a of docs) {
    if (!a.resume) continue;
    const opp = opportunityOf(a);
    const folder = safeName(opp?.title ?? "Unknown opportunity");
    const base = safeName(candidateOf(a)?.name ?? "Candidate");
    const ext = path.extname(a.resume.storedName) || path.extname(a.resume.fileName);
    let name = `resumes/${folder}/${base}${ext}`;
    for (let i = 2; used.has(name.toLowerCase()); i++) name = `resumes/${folder}/${base} (${i})${ext}`;
    used.add(name.toLowerCase());
    out.set(a.id, name);
  }
  return out;
}

const COLUMNS = [
  { header: "Applied on", key: "appliedOn", width: 13 },
  { header: "Candidate", key: "name", width: 24 },
  { header: "Email", key: "email", width: 30 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "City", key: "city", width: 14 },
  { header: "Opportunity", key: "opportunity", width: 32 },
  { header: "Type", key: "type", width: 12 },
  { header: "Status", key: "status", width: 14 },
  { header: "Source", key: "source", width: 16 },
  { header: "Expected salary (PKR)", key: "expectedSalary", width: 14 },
  { header: "Experience (years)", key: "experience", width: 12 },
  { header: "Education", key: "education", width: 22 },
  { header: "Headline", key: "headline", width: 28 },
  { header: "Skills", key: "skills", width: 32 },
  { header: "LinkedIn", key: "linkedin", width: 28 },
  { header: "Resume", key: "resume", width: 40 },
  { header: "Cover letter", key: "coverLetter", width: 60 },
  { header: "Last updated", key: "updatedOn", width: 13 },
] as const;
type Row = Record<(typeof COLUMNS)[number]["key"], string | number | Date | null>;

function toRows(docs: ApplicationDoc[], resumeRef: (a: ApplicationDoc) => string): Row[] {
  return docs.map((a) => {
    const u = candidateOf(a);
    const o = opportunityOf(a);
    return {
      appliedOn: a.createdAt,
      name: u?.name ?? "",
      email: u?.email ?? "",
      phone: a.phone || u?.phone || "",
      city: a.city || u?.city || "",
      opportunity: o?.title ?? "(deleted)",
      type: o ? OPPORTUNITY_TYPE_META[o.type as OpportunityType].label : "",
      status: APPLICATION_STATUS_LABEL[a.status as ApplicationStatus],
      source: a.source,
      expectedSalary: a.expectedSalary ?? null,
      experience: u?.experienceYears ?? null,
      education: u?.education ?? "",
      headline: u?.headline ?? "",
      skills: (u?.skills ?? []).join(", "),
      linkedin: u?.linkedinUrl ?? "",
      resume: a.resume ? resumeRef(a) : "",
      coverLetter: a.coverLetter,
      updatedOn: a.updatedAt,
    };
  });
}

/* ----------------------------------------------------------- writers */

function buildWorkbook(rows: Row[], linkResumes: boolean) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DigiBizz Jobs";
  wb.created = new Date();
  const ws = wb.addWorksheet("Applications", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ ...c }));
  for (const r of rows) {
    const row = ws.addRow(r);
    const cell = row.getCell("resume");
    if (r.resume && linkResumes) {
      cell.value = { text: String(r.resume), hyperlink: String(r.resume) };
      cell.font = { color: { argb: "FF2563EB" }, underline: true };
    }
    if (r.linkedin) {
      row.getCell("linkedin").value = { text: String(r.linkedin), hyperlink: String(r.linkedin) };
      row.getCell("linkedin").font = { color: { argb: "FF2563EB" }, underline: true };
    }
  }
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  ws.getColumn("appliedOn").numFmt = "yyyy-mm-dd";
  ws.getColumn("updatedOn").numFmt = "yyyy-mm-dd";
  ws.getColumn("expectedSalary").numFmt = "#,##0";
  ws.getColumn("coverLetter").alignment = { wrapText: true, vertical: "top" };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  return wb;
}

const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v);
  // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

function toCsv(rows: Row[]) {
  const lines = [COLUMNS.map((c) => csvCell(c.header)).join(",")];
  for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c.key])).join(","));
  // BOM so Excel opens UTF-8 (Urdu names etc.) correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

const stamp = () => new Date().toISOString().slice(0, 10);

export async function sendSpreadsheet(res: Response, docs: ApplicationDoc[], format: "xlsx" | "csv", resumeUrl: (id: string) => string) {
  const rows = toRows(docs, (a) => resumeUrl(a.id));
  const name = `applications-${stamp()}.${format}`;
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Cache-Control", "no-store");
  if (format === "csv") {
    res.type("text/csv; charset=utf-8").send(toCsv(rows));
    return;
  }
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  await buildWorkbook(rows, true).xlsx.write(res);
  res.end();
}

/**
 * Stream a ZIP with every matching resume (grouped by opportunity) plus an
 * applications.xlsx whose "Resume" column points at the file inside the ZIP.
 */
export async function sendResumeZip(res: Response, docs: ApplicationDoc[]) {
  const paths = resumePaths(docs);
  const rows = toRows(docs, (a) => paths.get(a.id) ?? "");
  const xlsx = Buffer.from(await buildWorkbook(rows, true).xlsx.writeBuffer());

  res.setHeader("Content-Disposition", `attachment; filename="resumes-${stamp()}.zip"`);
  res.setHeader("Cache-Control", "no-store");
  res.type("application/zip");

  const zip = archiver("zip", { zlib: { level: 6 } });
  zip.on("warning", () => undefined);
  zip.on("error", (err) => res.destroy(err));
  zip.pipe(res);
  zip.append(xlsx, { name: "applications.xlsx" });

  const missing: string[] = [];
  for (const a of docs) {
    const inZip = paths.get(a.id);
    if (!inZip || !a.resume) continue;
    const file = path.join(RESUME_DIR, path.basename(a.resume.storedName));
    if (fs.existsSync(file)) zip.file(file, { name: inZip });
    else missing.push(inZip);
  }
  if (missing.length) zip.append(`These resumes are listed but their files are missing on the server:\n\n${missing.join("\n")}\n`, { name: "MISSING-FILES.txt" });
  await zip.finalize();
}

/* -------------------------------------------------------- candidates */

export const candidateFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(60).optional(),
  resume: z.enum(["yes", "no"]).optional(),
  minExperience: z.coerce.number().min(0).max(60).optional(),
  skill: z.string().trim().max(60).optional(),
});
export type CandidateFilter = z.output<typeof candidateFilterSchema>;

export function buildCandidateFilter(q: CandidateFilter): FilterQuery<UserDoc> {
  const and: FilterQuery<UserDoc>[] = [{ role: "candidate" }];
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    and.push({ $or: [{ name: rx }, { email: rx }, { skills: rx }, { city: rx }, { phone: rx }] });
  }
  if (q.city) and.push({ city: new RegExp(escapeRegex(q.city), "i") });
  if (q.skill) and.push({ skills: new RegExp(escapeRegex(q.skill), "i") });
  if (q.resume === "yes") and.push({ resume: { $ne: null } });
  if (q.resume === "no") and.push({ resume: null });
  if (q.minExperience != null) and.push({ experienceYears: { $gte: q.minExperience } });
  return { $and: and };
}

export async function sendCandidatesSheet(res: Response, users: UserDoc[], format: "xlsx" | "csv") {
  const cols = [
    { header: "Joined", key: "joined", width: 13 },
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "City", key: "city", width: 14 },
    { header: "Headline", key: "headline", width: 28 },
    { header: "Education", key: "education", width: 22 },
    { header: "Experience (years)", key: "experience", width: 12 },
    { header: "Skills", key: "skills", width: 36 },
    { header: "LinkedIn", key: "linkedin", width: 28 },
    { header: "Has resume", key: "resume", width: 10 },
    { header: "Last login", key: "lastLogin", width: 13 },
  ] as const;
  const rows = users.map((u) => ({
    joined: u.createdAt,
    name: u.name,
    email: u.email,
    phone: u.phone,
    city: u.city,
    headline: u.headline,
    education: u.education,
    experience: u.experienceYears ?? null,
    skills: u.skills.join(", "),
    linkedin: u.linkedinUrl,
    resume: u.resume ? "Yes" : "No",
    lastLogin: u.lastLoginAt ?? null,
  }));
  res.setHeader("Content-Disposition", `attachment; filename="candidates-${stamp()}.${format}"`);
  res.setHeader("Cache-Control", "no-store");
  if (format === "csv") {
    const lines = [cols.map((c) => csvCell(c.header)).join(",")];
    for (const r of rows) lines.push(cols.map((c) => csvCell(r[c.key])).join(","));
    res.type("text/csv; charset=utf-8").send(`﻿${lines.join("\r\n")}\r\n`);
    return;
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = "DigiBizz Jobs";
  const ws = wb.addWorksheet("Candidates", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ ...c }));
  ws.addRows(rows);
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  ws.getColumn("joined").numFmt = "yyyy-mm-dd";
  ws.getColumn("lastLogin").numFmt = "yyyy-mm-dd";
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  await wb.xlsx.write(res);
  res.end();
}
