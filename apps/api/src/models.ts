import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";
import {
  APPLICATION_STATUSES,
  CATEGORIES,
  EMPLOYMENT_TYPES,
  GENDERS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  PARTNER_SCOPES,
  SALARY_PERIODS,
  USER_ROLES,
  WORK_MODES,
} from "@digibizz/jobs-shared";

const str = (extra: Record<string, unknown> = {}) => ({ type: String, trim: true, default: "", ...extra });
const nullableNumber = { type: Number, default: null };

const fileSchema = new Schema(
  {
    fileName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ user */

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "candidate", index: true },
    phone: str(),
    city: str(),
    headline: str(),
    education: str(),
    experienceYears: nullableNumber,
    skills: { type: [String], default: [] },
    about: str(),
    linkedinUrl: str(),
    resume: { type: fileSchema, default: null },
    saved: [{ type: Schema.Types.ObjectId, ref: "Opportunity" }],
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;
export const UserModel = mongoose.model("User", userSchema);

/* ---------------------------------------------------------- organization */

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: CATEGORIES, required: true },
    website: str(),
    city: str(),
    country: str({ default: "Pakistan" }),
    about: str(),
    logo: { type: String, default: null },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export type Organization = InferSchemaType<typeof organizationSchema>;
export type OrganizationDoc = HydratedDocument<Organization>;
export const OrganizationModel = mongoose.model("Organization", organizationSchema);

/* ----------------------------------------------------------- opportunity */

const opportunitySchema = new Schema(
  {
    type: { type: String, enum: OPPORTUNITY_TYPES, required: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    /** Denormalised for text search and partner feeds. Kept in sync when the organization is renamed. */
    organizationName: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    isITRelated: { type: Boolean, default: true },
    field: str(),
    summary: str(),
    description: { type: String, required: true },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    eligibility: str(),
    skills: { type: [String], default: [] },
    education: str(),
    qualification: str(),
    experienceMinYears: nullableNumber,
    experienceMaxYears: nullableNumber,
    gender: { type: String, enum: GENDERS, default: "any" },
    ageMin: nullableNumber,
    ageMax: nullableNumber,
    country: str({ default: "Pakistan" }),
    city: str(),
    address: str(),
    workMode: { type: String, enum: WORK_MODES, default: "onsite" },
    employmentType: { type: String, enum: [...EMPLOYMENT_TYPES, null], default: null },
    positions: { type: Number, default: 1 },
    salaryMin: nullableNumber,
    salaryMax: nullableNumber,
    salaryCurrency: { type: String, default: "PKR" },
    salaryPeriod: { type: String, enum: SALARY_PERIODS, default: "month" },
    salaryNegotiable: { type: Boolean, default: false },
    contractDuration: str(),
    duration: str(),
    fee: nullableNumber,
    certification: str(),
    benefits: { type: [String], default: [] },
    startDate: { type: Date, default: null },
    /** Stored as UTC midnight of the last day applications are accepted. */
    deadline: { type: Date, default: null },
    externalApplyUrl: str(),
    status: { type: String, enum: OPPORTUNITY_STATUSES, default: "draft" },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
opportunitySchema.index({ status: 1, type: 1, deadline: 1 });
opportunitySchema.index({ type: 1, isITRelated: 1, updatedAt: -1 });
opportunitySchema.index({ featured: 1, publishedAt: -1 });
export type Opportunity = InferSchemaType<typeof opportunitySchema>;
export type OpportunityDoc = HydratedDocument<Opportunity>;
export const OpportunityModel = mongoose.model("Opportunity", opportunitySchema);

/* ----------------------------------------------------------- application */

const applicationSchema = new Schema(
  {
    opportunity: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: "submitted", index: true },
    coverLetter: str(),
    phone: str(),
    city: str(),
    expectedSalary: nullableNumber,
    /** Where the candidate came from, e.g. "direct" or a partner slug such as "industechconnect". */
    source: { type: String, default: "direct", index: true },
    resume: { type: fileSchema, default: null },
    history: [
      new Schema(
        {
          status: { type: String, enum: APPLICATION_STATUSES, required: true },
          note: str(),
          at: { type: Date, default: () => new Date() },
          by: { type: Schema.Types.ObjectId, ref: "User", default: null },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);
applicationSchema.index({ opportunity: 1, user: 1 }, { unique: true });
applicationSchema.index({ createdAt: -1 });
export type Application = InferSchemaType<typeof applicationSchema>;
export type ApplicationDoc = HydratedDocument<Application>;
export const ApplicationModel = mongoose.model("Application", applicationSchema);

/* --------------------------------------------------------------- api key */

const apiKeySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    partnerSlug: { type: String, required: true, lowercase: true, trim: true },
    prefix: { type: String, required: true },
    /** SHA-256 of the full key. The key itself is shown once and never stored. */
    hash: { type: String, required: true, unique: true },
    scopes: { type: [String], enum: PARTNER_SCOPES, default: [...PARTNER_SCOPES] },
    requestCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
export type ApiKey = InferSchemaType<typeof apiKeySchema>;
export type ApiKeyDoc = HydratedDocument<ApiKey>;
export const ApiKeyModel = mongoose.model("ApiKey", apiKeySchema);

const apiUsageSchema = new Schema({
  key: { type: Schema.Types.ObjectId, ref: "ApiKey", required: true },
  day: { type: String, required: true },
  count: { type: Number, default: 0 },
});
apiUsageSchema.index({ key: 1, day: 1 }, { unique: true });
export const ApiUsageModel = mongoose.model("ApiUsage", apiUsageSchema);

export type Id = Types.ObjectId;
