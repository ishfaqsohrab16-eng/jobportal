import {
  CATEGORY_LABEL,
  derivePublicStatus,
  DIGIBIZZ,
  EMPLOYMENT_TYPE_LABEL,
  formatAge,
  formatExperience,
  formatGender,
  formatLocation,
  formatSalary,
  GENDER_LABEL,
  OPPORTUNITY_TYPE_META,
  type EmploymentType,
} from "@digibizz/jobs-shared";
import { config } from "../config";
import type { OpportunityDoc } from "../models";

/**
 * Partner-facing JSON. snake_case, stable and additive-only: fields may be
 * added in v1 but never renamed or removed.
 *
 * Everything on this portal is published by DigiBizz Balochistan, so the
 * organization block is constant and apply links always lead to our own
 * application page.
 */

const isoDay = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export function partnerLinks(o: OpportunityDoc, partnerSlug: string) {
  const ref = encodeURIComponent(partnerSlug);
  const detail = `${config.publicWebUrl}/opportunities/${o.slug}`;
  return {
    apply_link: `${detail}/apply?ref=${ref}`,
    source_url: `${detail}?ref=${ref}`,
  };
}

function base(o: OpportunityDoc, partnerSlug: string) {
  return {
    id: String(o._id),
    type: o.type,
    type_label: OPPORTUNITY_TYPE_META[o.type].label,
    title: o.title,
    slug: o.slug,
    category: CATEGORY_LABEL[DIGIBIZZ.category],
    organization_name: DIGIBIZZ.name,
    organization: {
      name: DIGIBIZZ.name,
      type: CATEGORY_LABEL[DIGIBIZZ.category],
      website: config.publicWebUrl,
      logo_url: `${config.publicWebUrl}/logo.svg`,
      verified: true,
    },
    location: {
      country: o.country,
      city: o.city || null,
      address: o.address || null,
      work_mode: o.workMode,
      display: formatLocation(o),
    },
    is_it_related: o.isITRelated,
    field: o.field || null,
    summary: o.summary || null,
    description: o.description,
    eligibility: o.eligibility || null,
    application_deadline: isoDay(o.deadline),
    ...partnerLinks(o, partnerSlug),
    status: derivePublicStatus(o.status, o.deadline),
    posted_at: iso(o.publishedAt ?? o.createdAt),
    updated_at: iso(o.updatedAt),
  };
}

const money = (o: OpportunityDoc) => ({
  min: o.salaryMin ?? null,
  max: o.salaryMax ?? null,
  currency: o.salaryCurrency,
  period: o.salaryPeriod,
  negotiable: o.salaryNegotiable,
  display: formatSalary(o),
});

const empType = (t: EmploymentType | null | undefined) =>
  t ? { employment_type: t, employment_type_label: EMPLOYMENT_TYPE_LABEL[t] } : { employment_type: null, employment_type_label: null };

export function toPartnerJob(o: OpportunityDoc, partnerSlug: string) {
  return {
    ...base(o, partnerSlug),
    employer_name: DIGIBIZZ.name,
    number_of_positions: o.positions,
    salary: money(o),
    gender: o.gender,
    gender_label: formatGender(o.gender),
    age_limit: { min: o.ageMin ?? null, max: o.ageMax ?? null, display: formatAge(o.ageMin, o.ageMax) },
    education: o.education || null,
    qualification: o.qualification || null,
    experience: {
      min_years: o.experienceMinYears ?? null,
      max_years: o.experienceMaxYears ?? null,
      display: formatExperience(o.experienceMinYears, o.experienceMaxYears),
    },
    skills: o.skills,
    requirements: o.requirements,
    responsibilities: o.responsibilities,
    contract_duration: o.contractDuration || null,
    ...empType(o.employmentType),
    benefits: o.benefits,
    start_date: isoDay(o.startDate),
  };
}

export function toPartnerInternship(o: OpportunityDoc, partnerSlug: string) {
  return {
    ...base(o, partnerSlug),
    duration: o.duration || null,
    number_of_positions: o.positions,
    stipend: money(o),
    ...empType(o.employmentType),
    gender: o.gender,
    gender_label: GENDER_LABEL[o.gender],
    age_limit: { min: o.ageMin ?? null, max: o.ageMax ?? null, display: formatAge(o.ageMin, o.ageMax) },
    education: o.education || null,
    skills: o.skills,
    requirements: o.requirements,
    benefits: o.benefits,
    start_date: isoDay(o.startDate),
  };
}

/** Programs/courses and trainings share one shape. */
export function toPartnerLearning(o: OpportunityDoc, partnerSlug: string) {
  return {
    ...base(o, partnerSlug),
    duration: o.duration || null,
    mode: o.workMode,
    seats: o.positions,
    fee:
      o.fee == null
        ? { amount: null, currency: o.salaryCurrency, is_free: null, display: "Contact DigiBizz" }
        : {
            amount: o.fee,
            currency: o.salaryCurrency,
            is_free: o.fee === 0,
            display: o.fee === 0 ? "Free" : `${o.salaryCurrency} ${o.fee.toLocaleString("en-US")}`,
          },
    stipend: o.salaryMin != null || o.salaryMax != null ? money(o) : null,
    gender: o.gender,
    age_limit: { min: o.ageMin ?? null, max: o.ageMax ?? null, display: formatAge(o.ageMin, o.ageMax) },
    education: o.education || null,
    skills: o.skills,
    requirements: o.requirements,
    outcomes: o.benefits,
    certification: o.certification || null,
    start_date: isoDay(o.startDate),
  };
}
