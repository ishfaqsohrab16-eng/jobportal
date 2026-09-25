import {
  derivePublicStatus,
  DIGIBIZZ,
  type ApiKeyDTO,
  type ApplicationDTO,
  type ApplicationStatus,
  type OpportunityDTO,
  type OrganizationSummary,
  type UserDTO,
} from "@digibizz/jobs-shared";
import { Types } from "mongoose";
import type { ApiKeyDoc, ApplicationDoc, Opportunity, OpportunityDoc, UserDoc } from "./models";

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
const isoDay = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Every opportunity on this portal is published by DigiBizz Balochistan. */
export const DIGIBIZZ_ORG: OrganizationSummary = {
  id: DIGIBIZZ.slug,
  name: DIGIBIZZ.name,
  slug: DIGIBIZZ.slug,
  category: DIGIBIZZ.category,
  logoUrl: "/logo.svg",
  verified: true,
};

export function toUserDTO(u: UserDoc): UserDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    city: u.city,
    headline: u.headline,
    education: u.education,
    experienceYears: u.experienceYears ?? null,
    skills: u.skills,
    about: u.about,
    linkedinUrl: u.linkedinUrl,
    resume: u.resume
      ? { fileName: u.resume.fileName, size: u.resume.size, uploadedAt: iso(u.resume.uploadedAt)! }
      : null,
    createdAt: iso(u.createdAt)!,
  };
}

type OppLike = OpportunityDoc | (Opportunity & { _id: Types.ObjectId });

export function toOpportunityDTO(
  o: OppLike,
  viewer?: { saved: boolean; applicationStatus: ApplicationStatus | null },
): OpportunityDTO {
  return {
    id: String(o._id),
    type: o.type,
    slug: o.slug,
    title: o.title,
    organization: DIGIBIZZ_ORG,
    category: DIGIBIZZ.category,
    isITRelated: o.isITRelated,
    field: o.field,
    summary: o.summary,
    description: o.description,
    responsibilities: o.responsibilities,
    requirements: o.requirements,
    eligibility: o.eligibility,
    skills: o.skills,
    education: o.education,
    qualification: o.qualification,
    experienceMinYears: o.experienceMinYears ?? null,
    experienceMaxYears: o.experienceMaxYears ?? null,
    gender: o.gender,
    ageMin: o.ageMin ?? null,
    ageMax: o.ageMax ?? null,
    country: o.country,
    city: o.city,
    address: o.address,
    workMode: o.workMode,
    employmentType: o.employmentType ?? null,
    positions: o.positions,
    salaryMin: o.salaryMin ?? null,
    salaryMax: o.salaryMax ?? null,
    salaryCurrency: o.salaryCurrency,
    salaryPeriod: o.salaryPeriod,
    salaryNegotiable: o.salaryNegotiable,
    contractDuration: o.contractDuration,
    duration: o.duration,
    fee: o.fee ?? null,
    certification: o.certification,
    benefits: o.benefits,
    startDate: isoDay(o.startDate),
    deadline: isoDay(o.deadline),
    status: o.status,
    publicStatus: derivePublicStatus(o.status, o.deadline),
    featured: o.featured,
    views: o.views,
    applicationsCount: o.applicationsCount,
    publishedAt: iso(o.publishedAt),
    createdAt: iso(o.createdAt)!,
    updatedAt: iso(o.updatedAt)!,
    ...(viewer ? { viewer } : {}),
  };
}

export function toApplicationDTO(a: ApplicationDoc, opts: { withCandidate?: boolean } = {}): ApplicationDTO {
  const opp = a.opportunity as unknown as OpportunityDoc | null;
  const user = a.user as unknown as UserDoc | null;
  return {
    id: a.id,
    status: a.status,
    coverLetter: a.coverLetter,
    phone: a.phone,
    city: a.city,
    expectedSalary: a.expectedSalary ?? null,
    source: a.source,
    hasResume: Boolean(a.resume),
    history: a.history.map((h) => ({ status: h.status, note: h.note, at: iso(h.at)! })),
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt)!,
    opportunity: opp && typeof opp === "object" && "title" in opp
      ? {
          id: String(opp._id),
          slug: opp.slug,
          title: opp.title,
          type: opp.type,
          deadline: isoDay(opp.deadline),
          publicStatus: derivePublicStatus(opp.status, opp.deadline),
          organizationName: DIGIBIZZ.name,
        }
      : { id: String(opp), slug: "", title: "Removed opportunity", type: "job", deadline: null, publicStatus: "closed", organizationName: DIGIBIZZ.name },
    ...(opts.withCandidate && user && typeof user === "object" && "email" in user
      ? {
          candidate: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            headline: user.headline,
            skills: user.skills,
            experienceYears: user.experienceYears ?? null,
            education: user.education,
          },
        }
      : {}),
  };
}

export function toApiKeyDTO(k: ApiKeyDoc): ApiKeyDTO {
  return {
    id: k.id,
    name: k.name,
    partnerSlug: k.partnerSlug,
    prefix: k.prefix,
    scopes: k.scopes as ApiKeyDTO["scopes"],
    requestCount: k.requestCount,
    lastUsedAt: iso(k.lastUsedAt),
    revokedAt: iso(k.revokedAt),
    createdAt: iso(k.createdAt)!,
  };
}
