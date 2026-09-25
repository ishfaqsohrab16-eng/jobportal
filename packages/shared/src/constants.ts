/**
 * Vocabulary shared by the API, the web app and the partner API.
 * Every enum stored in the database is declared here once.
 */

export const OPPORTUNITY_TYPES = ["job", "internship", "program", "training"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_TYPE_META: Record<
  OpportunityType,
  { label: string; plural: string; path: string; blurb: string }
> = {
  job: {
    label: "Job",
    plural: "Jobs",
    path: "jobs",
    blurb: "Full-time, part-time and contract roles across Pakistan and abroad.",
  },
  internship: {
    label: "Internship",
    plural: "Internships",
    path: "internships",
    blurb: "Paid and unpaid placements to get real industry experience.",
  },
  program: {
    label: "Program",
    plural: "Programs & Courses",
    path: "programs",
    blurb: "Degree, diploma and certification programs to build your career.",
  },
  training: {
    label: "Training",
    plural: "Trainings",
    path: "trainings",
    blurb: "Short, hands-on skills trainings, bootcamps and workshops.",
  },
};

export const typeFromPath = (path: string): OpportunityType | undefined =>
  OPPORTUNITY_TYPES.find((t) => OPPORTUNITY_TYPE_META[t].path === path);

/** Who is offering the opportunity. IndusTech asks for exactly these three. */
export const CATEGORIES = ["government", "international", "private"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = {
  government: "Government",
  international: "International",
  private: "Private",
};

export const WORK_MODES = ["onsite", "remote", "hybrid"] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "freelance",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  freelance: "Freelance",
};

export const GENDERS = ["any", "male", "female"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABEL: Record<Gender, string> = {
  any: "Any",
  male: "Male",
  female: "Female",
};

export const SALARY_PERIODS = ["month", "year", "hour", "total"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];
export const SALARY_PERIOD_LABEL: Record<SalaryPeriod, string> = {
  month: "per month",
  year: "per year",
  hour: "per hour",
  total: "total",
};

/** Lifecycle an admin controls. "expired" is never stored - it is derived from the deadline. */
export const OPPORTUNITY_STATUSES = ["draft", "open", "closed"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type PublicStatus = "open" | "closed" | "expired";

export const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offered",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const USER_ROLES = ["admin", "candidate"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Fields an opportunity can be tagged with. Used for the IT-only filter IndusTech asked for. */
export const FIELDS = [
  "Software Development",
  "Web Development",
  "Mobile App Development",
  "Data Science & AI",
  "Cloud & DevOps",
  "Cybersecurity",
  "Networking & Telecom",
  "UI/UX & Graphic Design",
  "Digital Marketing",
  "E-Commerce",
  "Freelancing",
  "IT Support & Helpdesk",
  "Quality Assurance",
  "Database Administration",
  "IT Project Management",
  "Game Development",
  "Blockchain",
  "Education & Training",
  "Administration",
  "Finance & Accounts",
  "Engineering (Non-IT)",
  "Health",
  "Other",
] as const;

export const CITIES = [
  "Quetta",
  "Gwadar",
  "Turbat",
  "Khuzdar",
  "Hub",
  "Sibi",
  "Zhob",
  "Loralai",
  "Chaman",
  "Nushki",
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Peshawar",
  "Multan",
  "Faisalabad",
  "Hyderabad",
] as const;

export const PARTNER_SCOPES = ["jobs", "internships", "programs", "trainings"] as const;
export type PartnerScope = (typeof PARTNER_SCOPES)[number];

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_BYTES = 1 * 1024 * 1024;
