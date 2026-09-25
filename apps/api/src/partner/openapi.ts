import { config } from "../config";

/** OpenAPI 3.1 description of the partner API, served at /api/partner/v1/openapi.json. */
export function buildOpenApi() {
  const str = (description?: string, extra: object = {}) => ({ type: "string", ...(description ? { description } : {}), ...extra });
  const nstr = (description?: string) => ({ type: ["string", "null"], ...(description ? { description } : {}) });
  const nint = (description?: string) => ({ type: ["integer", "null"], ...(description ? { description } : {}) });
  const strList = (description: string) => ({ type: "array", items: { type: "string" }, description });
  const range = (description: string) => ({
    type: "object",
    description,
    properties: { min: nint(), max: nint(), display: str("Human-readable text") },
  });
  const money = (description: string) => ({
    type: "object",
    description,
    properties: {
      min: nint(),
      max: nint(),
      currency: str("ISO 4217 code", { example: "PKR" }),
      period: str(undefined, { enum: ["month", "year", "hour", "total"] }),
      negotiable: { type: "boolean" },
      display: str(undefined, { example: "PKR 80,000 – 120,000 per month" }),
    },
  });

  const base = {
    id: str("Stable identifier"),
    type: str(undefined, { enum: ["job", "internship", "program", "training"] }),
    type_label: str(),
    title: str("Job title / internship name / program or training name"),
    slug: str(),
    category: str("Job category. Always Government: DigiBizz Balochistan is the only publisher.", { enum: ["Government", "International", "Private"] }),
    organization_name: str("Always \"DigiBizz Balochistan\""),
    organization: {
      type: "object",
      properties: {
        name: str("Employer / organization name - always DigiBizz Balochistan"),
        type: str(undefined, { enum: ["Government", "International", "Private"] }),
        website: nstr(),
        logo_url: nstr(),
        verified: { type: "boolean" },
      },
    },
    location: {
      type: "object",
      properties: {
        country: str(),
        city: nstr(),
        address: nstr(),
        work_mode: str(undefined, { enum: ["onsite", "remote", "hybrid"] }),
        display: str(undefined, { example: "Quetta, Pakistan" }),
      },
    },
    is_it_related: { type: "boolean" },
    field: nstr("e.g. Software Development, Cybersecurity"),
    summary: nstr(),
    description: str("Full description (plain text, newlines preserved)"),
    eligibility: nstr(),
    application_deadline: { type: ["string", "null"], format: "date", description: "Last day applications are accepted (inclusive). null = rolling." },
    apply_link: str("DigiBizz application page for this item. Carries ?ref=<partner> so applications are attributed to you.", { format: "uri" }),
    source_url: str("Public detail page on DigiBizz Jobs", { format: "uri" }),
    status: str("open = accepting applications; expired = deadline passed; closed = closed by DigiBizz", {
      enum: ["open", "closed", "expired"],
    }),
    posted_at: { type: ["string", "null"], format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  };

  const Job = {
    type: "object",
    properties: {
      ...base,
      employer_name: str(),
      number_of_positions: { type: "integer" },
      salary: money("Salary range"),
      gender: str(undefined, { enum: ["any", "male", "female"] }),
      gender_label: str(),
      age_limit: range("Age limit in years"),
      education: nstr("Minimum education"),
      qualification: nstr("Required qualification / degree"),
      experience: {
        type: "object",
        properties: { min_years: nint(), max_years: nint(), display: str() },
      },
      skills: strList("Required skills"),
      requirements: strList("Requirements, one per item"),
      responsibilities: strList("Responsibilities, one per item"),
      contract_duration: nstr("e.g. Permanent, 1 year (extendable)"),
      employment_type: { type: ["string", "null"], enum: ["full_time", "part_time", "contract", "temporary", "freelance", null] },
      employment_type_label: nstr(),
      benefits: strList("Benefits"),
      start_date: { type: ["string", "null"], format: "date" },
    },
  };

  const Internship = {
    type: "object",
    properties: {
      ...base,
      duration: nstr("e.g. 3 months"),
      number_of_positions: { type: "integer" },
      stipend: money("Stipend"),
      employment_type: nstr(),
      employment_type_label: nstr(),
      gender: str(),
      gender_label: str(),
      age_limit: range("Age limit in years"),
      education: nstr(),
      skills: strList("Skills"),
      requirements: strList("Requirements"),
      benefits: strList("Benefits"),
      start_date: { type: ["string", "null"], format: "date" },
    },
  };

  const Learning = {
    type: "object",
    properties: {
      ...base,
      duration: nstr("e.g. 12 weeks"),
      mode: str(undefined, { enum: ["onsite", "remote", "hybrid"] }),
      seats: { type: "integer" },
      fee: {
        type: "object",
        properties: { amount: nint(), currency: str(), is_free: { type: ["boolean", "null"] }, display: str() },
      },
      stipend: { oneOf: [money("Stipend, when offered"), { type: "null" }] },
      gender: str(),
      age_limit: range("Age limit in years"),
      education: nstr(),
      skills: strList("Skills covered"),
      requirements: strList("Entry requirements"),
      outcomes: strList("What participants get"),
      certification: nstr(),
      start_date: { type: ["string", "null"], format: "date" },
    },
  };

  const listOf = (ref: string) => ({
    type: "object",
    properties: {
      data: { type: "array", items: { $ref: `#/components/schemas/${ref}` } },
      meta: {
        type: "object",
        properties: {
          collection: str(),
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          total_pages: { type: "integer" },
          generated_at: { type: "string", format: "date-time" },
        },
      },
      links: { type: "object", properties: { self: str(), next: nstr(), prev: nstr() } },
    },
  });

  const params = [
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
    { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
    {
      name: "status",
      in: "query",
      description: "Filter by public status. Defaults to open.",
      schema: { type: "string", enum: ["open", "closed", "expired", "all"], default: "open" },
    },
    {
      name: "updated_since",
      in: "query",
      description: "Only items changed at or after this ISO date/date-time. Use for incremental sync.",
      schema: { type: "string" },
    },
    { name: "city", in: "query", schema: { type: "string" } },
    { name: "q", in: "query", description: "Keyword search on title, skills and field", schema: { type: "string" } },
  ];
  const itOnly = {
    name: "it_only",
    in: "query",
    description: "true = only IT / IT-related items",
    schema: { type: "string", enum: ["true", "false"], default: "false" },
  };
  const errors = {
    "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    "403": { description: "Key lacks the scope for this collection" },
    "429": { description: "Rate limit exceeded (240 requests/minute/key)" },
  };

  const collection = (path: string, schema: string, summary: string, description: string, extraParams: object[] = []) => ({
    [`/${path}`]: {
      get: {
        tags: [schema],
        summary,
        description,
        parameters: [...params, ...extraParams],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: listOf(schema) } } },
          ...errors,
        },
      },
    },
    [`/${path}/{id}`]: {
      get: {
        tags: [schema],
        summary: `Get one ${schema.toLowerCase()} by id or slug`,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: `#/components/schemas/${schema}` } } } } },
          },
          "404": { description: "Not found" },
          ...errors,
        },
      },
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "DigiBizz Jobs Partner API",
      version: "1.0.0",
      description:
        "Read-only feed of DigiBizz Balochistan's own jobs, internships, programs/courses and trainings. " +
        "Authenticate with the X-API-Key header. The jobs collection only returns IT / IT-related jobs.",
    },
    servers: [{ url: `${config.publicWebUrl}/api/partner/v1` }],
    security: [{ ApiKey: [] }],
    paths: {
      ...collection("jobs", "Job", "List IT jobs", "IT and IT-related jobs only."),
      ...collection("internships", "Internship", "List internships", "All internships; pass it_only=true for IT only.", [itOnly]),
      ...collection("programs", "Program", "List programs & courses", "Degree, diploma and certification programs and courses.", [itOnly]),
      ...collection("trainings", "Training", "List training programs", "Short trainings, bootcamps and workshops.", [itOnly]),
    },
    components: {
      securitySchemes: { ApiKey: { type: "apiKey", in: "header", name: "X-API-Key" } },
      schemas: {
        Job,
        Internship,
        Program: Learning,
        Training: Learning,
        Error: {
          type: "object",
          properties: { error: { type: "object", properties: { code: str(), message: str() } } },
        },
      },
    },
  };
}
