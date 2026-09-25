import { z } from "zod";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  PARTNER_SCOPES,
  SALARY_PERIODS,
  WORK_MODES,
} from "./constants";

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => trimmed(max).optional().default("");
const optionalInt = (max = 1_000_000_000) => z.number().int().min(0).max(max).nullish();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format")
  .nullish()
  .or(z.literal("").transform(() => null));
const list = (maxItems: number, maxLen = 300) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

/* ---------------------------------------------------------------- auth */

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/\d/, "Include a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.email("Enter a valid email").trim().toLowerCase().max(160),
  phone: trimmed(20).optional().default(""),
  password: passwordSchema,
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password").max(128),
});
export type LoginInput = z.input<typeof loginSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: optionalText(20),
  city: optionalText(60),
  headline: optionalText(120),
  education: optionalText(160),
  experienceYears: optionalInt(60),
  skills: list(30, 40),
  about: optionalText(1500),
  linkedinUrl: z.url().max(300).optional().or(z.literal("")).default(""),
});
export type ProfileInput = z.input<typeof profileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

/* ------------------------------------------------------- opportunities */

export const opportunitySchema = z
  .object({
    type: z.enum(OPPORTUNITY_TYPES),
    title: z.string().trim().min(3, "Title is too short").max(160),
    isITRelated: z.boolean().default(true),
    field: optionalText(60),
    summary: optionalText(300),
    description: z.string().trim().min(20, "Describe the opportunity (20+ characters)").max(20_000),
    responsibilities: list(40),
    requirements: list(40),
    eligibility: optionalText(3000),
    skills: list(30, 40),
    education: optionalText(160),
    qualification: optionalText(160),
    experienceMinYears: optionalInt(50),
    experienceMaxYears: optionalInt(50),
    gender: z.enum(GENDERS).default("any"),
    ageMin: optionalInt(100),
    ageMax: optionalInt(100),
    country: trimmed(60).min(2).default("Pakistan"),
    city: optionalText(60),
    address: optionalText(200),
    workMode: z.enum(WORK_MODES).default("onsite"),
    employmentType: z.enum(EMPLOYMENT_TYPES).nullish(),
    positions: z.number().int().min(1).max(100_000).default(1),
    salaryMin: optionalInt(),
    salaryMax: optionalInt(),
    salaryCurrency: z.string().trim().length(3).toUpperCase().default("PKR"),
    salaryPeriod: z.enum(SALARY_PERIODS).default("month"),
    salaryNegotiable: z.boolean().default(false),
    contractDuration: optionalText(80),
    duration: optionalText(80),
    fee: optionalInt(),
    certification: optionalText(160),
    benefits: list(30),
    startDate: isoDate,
    deadline: isoDate,
    status: z.enum(OPPORTUNITY_STATUSES).default("draft"),
    featured: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    const pair = (lo: number | null | undefined, hi: number | null | undefined, path: string, label: string) => {
      if (lo != null && hi != null && hi < lo) {
        ctx.addIssue({ code: "custom", path: [path], message: `Maximum ${label} must be at least the minimum` });
      }
    };
    pair(v.salaryMin, v.salaryMax, "salaryMax", "salary");
    pair(v.ageMin, v.ageMax, "ageMax", "age");
    pair(v.experienceMinYears, v.experienceMaxYears, "experienceMaxYears", "experience");
  });
export type OpportunityInput = z.input<typeof opportunitySchema>;
export type OpportunityData = z.output<typeof opportunitySchema>;

export const opportunityQuerySchema = z.object({
  q: trimmed(100).optional(),
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  city: trimmed(60).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  field: trimmed(60).optional(),
  it: z.enum(["1", "0"]).optional(),
  closingSoon: z.enum(["1"]).optional(),
  featured: z.enum(["1"]).optional(),
  sort: z.enum(["newest", "deadline", "salary"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type OpportunityQuery = z.input<typeof opportunityQuerySchema>;

/* -------------------------------------------------------- applications */

export const applySchema = z.object({
  coverLetter: optionalText(4000),
  phone: z.string().trim().min(7, "Enter a phone number we can reach you on").max(20),
  city: optionalText(60),
  expectedSalary: optionalInt(),
  source: trimmed(40).optional().default("direct"),
});
export type ApplyInput = z.input<typeof applySchema>;

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: optionalText(500),
});

/* ------------------------------------------------------------ partners */

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  partnerSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "Lowercase letters, numbers and dashes only"),
  scopes: z.array(z.enum(PARTNER_SCOPES)).min(1).default([...PARTNER_SCOPES]),
});
export type ApiKeyCreateInput = z.input<typeof apiKeyCreateSchema>;

export const partnerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  updated_since: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  status: z.enum(["open", "closed", "expired", "all"]).default("open"),
  city: trimmed(60).optional(),
  q: trimmed(100).optional(),
});
export type PartnerQuery = z.output<typeof partnerQuerySchema>;
