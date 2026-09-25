import type {
  ApplicationStatus,
  Category,
  EmploymentType,
  Gender,
  OpportunityStatus,
  OpportunityType,
  PartnerScope,
  PublicStatus,
  SalaryPeriod,
  UserRole,
  WorkMode,
} from "./constants";

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  city: string;
  headline: string;
  education: string;
  experienceYears: number | null;
  skills: string[];
  about: string;
  linkedinUrl: string;
  resume: { fileName: string; size: number; uploadedAt: string } | null;
  createdAt: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  category: Category;
  logoUrl: string | null;
  verified: boolean;
}

export interface OrganizationDTO extends OrganizationSummary {
  website: string;
  city: string;
  country: string;
  about: string;
  openCount?: number;
  createdAt: string;
}

export interface OpportunityDTO {
  id: string;
  type: OpportunityType;
  slug: string;
  title: string;
  organization: OrganizationSummary;
  category: Category;
  isITRelated: boolean;
  field: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  eligibility: string;
  skills: string[];
  education: string;
  qualification: string;
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  gender: Gender;
  ageMin: number | null;
  ageMax: number | null;
  country: string;
  city: string;
  address: string;
  workMode: WorkMode;
  employmentType: EmploymentType | null;
  positions: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: SalaryPeriod;
  salaryNegotiable: boolean;
  contractDuration: string;
  duration: string;
  fee: number | null;
  certification: string;
  benefits: string[];
  startDate: string | null;
  deadline: string | null;
  externalApplyUrl: string;
  status: OpportunityStatus;
  publicStatus: PublicStatus;
  featured: boolean;
  views: number;
  applicationsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present when a signed-in candidate asks. */
  viewer?: { saved: boolean; applicationStatus: ApplicationStatus | null };
}

export interface ApplicationDTO {
  id: string;
  status: ApplicationStatus;
  coverLetter: string;
  phone: string;
  city: string;
  expectedSalary: number | null;
  source: string;
  hasResume: boolean;
  history: { status: ApplicationStatus; note: string; at: string }[];
  createdAt: string;
  updatedAt: string;
  opportunity: Pick<OpportunityDTO, "id" | "slug" | "title" | "type" | "deadline" | "publicStatus"> & {
    organizationName: string;
  };
  candidate?: Pick<UserDTO, "id" | "name" | "email" | "headline" | "skills" | "experienceYears" | "education">;
}

export interface ApiKeyDTO {
  id: string;
  name: string;
  partnerSlug: string;
  prefix: string;
  scopes: PartnerScope[];
  requestCount: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface PublicStats {
  open: Record<OpportunityType, number>;
  organizations: number;
  cities: number;
  itShare: number;
}

export interface AdminOverview {
  opportunities: { total: number; open: number; draft: number; closingThisWeek: number; byType: Record<OpportunityType, number> };
  applications: { total: number; last7Days: number; byStatus: Partial<Record<ApplicationStatus, number>>; bySource: { source: string; count: number }[] };
  candidates: number;
  partnerRequests30d: number;
  daily: { date: string; applications: number }[];
  recent: ApplicationDTO[];
}
