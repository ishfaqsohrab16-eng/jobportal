import {
  GENDER_LABEL,
  SALARY_PERIOD_LABEL,
  WORK_MODE_LABEL,
  type Gender,
  type OpportunityStatus,
  type PublicStatus,
  type SalaryPeriod,
  type WorkMode,
} from "./constants";

const DAY_MS = 86_400_000;

/** Compact money, e.g. 85,000 -> "85k", 1,200,000 -> "1.2M". */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(n);
}

export function formatMoney(n: number, currency = "PKR"): string {
  return `${currency} ${n.toLocaleString("en-US")}`;
}

export function formatSalary(o: {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency: string;
  salaryPeriod: SalaryPeriod;
  salaryNegotiable: boolean;
}, opts: { compact?: boolean } = {}): string {
  const fmt = (n: number) => (opts.compact ? compactNumber(n) : n.toLocaleString("en-US"));
  const { salaryMin: lo, salaryMax: hi, salaryCurrency: cur } = o;
  const period = SALARY_PERIOD_LABEL[o.salaryPeriod];
  let range: string | null = null;
  if (lo != null && hi != null) range = lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
  else if (lo != null) range = `from ${fmt(lo)}`;
  else if (hi != null) range = `up to ${fmt(hi)}`;
  if (!range) return o.salaryNegotiable ? "Negotiable" : "Not disclosed";
  return `${cur} ${range} ${period}${o.salaryNegotiable ? " (negotiable)" : ""}`;
}

export function formatRange(
  lo: number | null | undefined,
  hi: number | null | undefined,
  unit: string,
  none = "Not specified",
): string {
  if (lo != null && hi != null) return lo === hi ? `${lo} ${unit}` : `${lo}–${hi} ${unit}`;
  if (lo != null) return `${lo}+ ${unit}`;
  if (hi != null) return `Up to ${hi} ${unit}`;
  return none;
}

export const formatExperience = (lo?: number | null, hi?: number | null) =>
  lo === 0 && (hi == null || hi === 0) ? "Fresh graduates welcome" : formatRange(lo, hi, "years", "Not specified");

export const formatAge = (lo?: number | null, hi?: number | null) => formatRange(lo, hi, "years", "No age limit");

export const formatGender = (g: Gender) => (g === "any" ? "Any gender" : `${GENDER_LABEL[g]} only`);

export function formatLocation(o: { city?: string; country?: string; workMode?: WorkMode }): string {
  const place = [o.city, o.country].filter(Boolean).join(", ");
  if (o.workMode === "remote") return place ? `Remote · ${place}` : "Remote";
  if (o.workMode === "hybrid") return place ? `${place} (Hybrid)` : "Hybrid";
  return place || "Pakistan";
}

export const workModeLabel = (m: WorkMode) => WORK_MODE_LABEL[m];

/** Start of the day after the deadline - applications are accepted through the whole deadline day. */
function deadlineCutoff(deadline: string | Date): number {
  const d = new Date(deadline);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + DAY_MS;
}

export function derivePublicStatus(
  status: OpportunityStatus,
  deadline: string | Date | null | undefined,
  now: Date = new Date(),
): PublicStatus {
  if (status !== "open") return "closed";
  if (deadline && now.getTime() >= deadlineCutoff(deadline)) return "expired";
  return "open";
}

/** Whole days until the deadline closes; 0 means "closes today", negative means passed. */
export function daysLeft(deadline: string | Date | null | undefined, now: Date = new Date()): number | null {
  if (!deadline) return null;
  return Math.ceil((deadlineCutoff(deadline) - now.getTime()) / DAY_MS) - 1;
}

export function deadlineLabel(deadline: string | Date | null | undefined, now: Date = new Date()): string {
  const d = daysLeft(deadline, now);
  if (d == null) return "Rolling deadline";
  if (d < 0) return "Deadline passed";
  if (d === 0) return "Closes today";
  if (d === 1) return "Closes tomorrow";
  if (d <= 30) return `${d} days left`;
  return `Closes ${formatDate(deadline!)}`;
}

export function formatDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
