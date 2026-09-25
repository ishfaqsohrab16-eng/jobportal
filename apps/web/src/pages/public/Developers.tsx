import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, FileCode, Key, Lightning, ShieldCheck, Timer } from "@phosphor-icons/react";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Reveal, Stagger } from "@/components/motion";
import { Badge, Segmented } from "@/components/ui";
import { fadeUp } from "@/lib/motion";

const base = `${typeof window !== "undefined" ? window.location.origin : ""}/api/partner/v1`;

type Collection = "jobs" | "internships" | "programs" | "trainings";

const JOB_EXAMPLE = {
  id: "66f1c0a2e4b0c1a2b3c4d5e6",
  type: "job",
  type_label: "Job",
  title: "Senior React Developer",
  slug: "senior-react-developer-bolan-software-house",
  category: "Private",
  organization: { name: "Bolan Software House", type: "Private", website: "https://…", logo_url: "https://…/api/files/logos/…png", verified: true },
  location: { country: "Pakistan", city: "Quetta", address: null, work_mode: "hybrid", display: "Quetta, Pakistan (Hybrid)" },
  is_it_related: true,
  field: "Web Development",
  description: "Bolan Software House is hiring…",
  eligibility: null,
  application_deadline: "2026-10-16",
  apply_link: "https://…/opportunities/senior-react-developer-bolan-software-house/apply?ref=industechconnect",
  source_url: "https://…/opportunities/senior-react-developer-bolan-software-house?ref=industechconnect",
  status: "open",
  posted_at: "2026-09-25T06:00:00.000Z",
  updated_at: "2026-09-25T06:00:00.000Z",
  employer_name: "Bolan Software House",
  number_of_positions: 2,
  salary: { min: 250000, max: 380000, currency: "PKR", period: "month", negotiable: false, display: "PKR 250,000 – 380,000 per month" },
  gender: "any",
  gender_label: "Any gender",
  age_limit: { min: 24, max: 40, display: "24–40 years" },
  education: "Bachelor's (16 years)",
  qualification: "BS Computer Science / Software Engineering",
  experience: { min_years: 4, max_years: 8, display: "4–8 years" },
  skills: ["React", "TypeScript", "Redux"],
  requirements: ["4+ years with React and TypeScript"],
  responsibilities: ["Own the front-end architecture"],
  contract_duration: "Permanent",
  employment_type: "full_time",
  employment_type_label: "Full-time",
  benefits: ["Medical insurance", "Annual bonus"],
  start_date: "2026-10-30",
};

const LEARNING_EXTRA = {
  duration: "6 months",
  mode: "hybrid",
  seats: 120,
  fee: { amount: 0, currency: "PKR", is_free: true, display: "Free" },
  stipend: null,
  education: "Intermediate",
  skills: ["HTML", "CSS", "JavaScript"],
  requirements: [],
  outcomes: ["Placement support"],
  certification: "DigiBizz certificate",
  start_date: "2026-11-01",
};

const EXAMPLES: Record<Collection, object> = {
  jobs: JOB_EXAMPLE,
  internships: {
    id: "…", type: "internship", title: "Frontend Engineering Intern", category: "Private",
    organization: { name: "Bolan Software House", type: "Private" }, location: { city: "Quetta", work_mode: "onsite", display: "Quetta, Pakistan" },
    description: "A 3-month paid internship…", eligibility: "Final-year students or fresh graduates of BS CS/SE/IT.",
    duration: "3 months", application_deadline: "2026-10-09", apply_link: "https://…/apply?ref=industechconnect", status: "open",
    number_of_positions: 5, stipend: { min: 35000, max: 35000, currency: "PKR", period: "month", display: "PKR 35,000 per month" },
  },
  programs: { id: "…", type: "program", title: "Certified Full-Stack Web Development", category: "Government", organization: { name: "DigiBizz Balochistan" }, description: "…", eligibility: "Age 18-35, intermediate or above.", application_deadline: "2026-10-15", apply_link: "https://…", status: "open", ...LEARNING_EXTRA },
  trainings: { id: "…", type: "training", title: "Freelancing Bootcamp: Upwork & Fiverr", category: "Government", organization: { name: "DigiBizz Balochistan" }, description: "…", eligibility: "Anyone with a laptop.", application_deadline: "2026-10-02", apply_link: "https://…", status: "open", ...LEARNING_EXTRA, duration: "4 weeks" },
};

const JOB_FIELDS: [string, string][] = [
  ["1. Job Title", "title"],
  ["2. Country / City / Location", "location.country · location.city · location.display"],
  ["3. Employer Name", "employer_name (also organization.name)"],
  ["4. Number of Positions", "number_of_positions"],
  ["5. Salary Range", "salary.min · salary.max · salary.currency · salary.display"],
  ["6. Gender / Age Limit", "gender · age_limit.min · age_limit.max"],
  ["7. Education / Qualification", "education · qualification"],
  ["8. Experience / Skills", "experience.min_years · experience.max_years · skills[]"],
  ["9. Job Description / Requirements", "description · requirements[] · responsibilities[]"],
  ["10. Contract Duration", "contract_duration"],
  ["11. Benefits", "benefits[]"],
  ["12. Application Deadline", "application_deadline (YYYY-MM-DD, inclusive)"],
  ["13. Apply Link", "apply_link"],
  ["14. Job Status", "status: open | closed | expired"],
  ["15. Job Category", "category: Government | International | Private"],
];

const OTHER_FIELDS: [string, string][] = [
  ["Name", "title"],
  ["Description", "description"],
  ["Eligibility", "eligibility · requirements[]"],
  ["Duration", "duration"],
  ["Deadline", "application_deadline"],
  ["Organization", "organization.name"],
  ["Location", "location.display (+ city, country, work_mode)"],
  ["Application link", "apply_link"],
];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => undefined);
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
      className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Copy"
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check weight="bold" className="size-4 text-brand" />
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Copy className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-night">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          {lang && <span className="ml-2 font-mono text-[11px] text-white/40">{lang}</span>}
        </span>
        <CopyButton text={children} />
      </div>
      <pre className="max-h-[520px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-[#d7e8df]">{children}</pre>
    </div>
  );
}

function FieldTable({ rows, heading }: { rows: [string, string][]; heading: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="grid grid-cols-[1fr_1.4fr] gap-4 bg-well px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        <span>{heading}</span>
        <span>JSON field</span>
      </div>
      <Stagger gap={0.025}>
        {rows.map(([a, b]) => (
          <motion.div key={a} variants={fadeUp} className="grid grid-cols-[1fr_1.4fr] gap-4 border-t border-line px-4 py-3 text-sm">
            <span className="font-medium">{a}</span>
            <code className="font-mono text-[12.5px] text-brand">{b}</code>
          </motion.div>
        ))}
      </Stagger>
    </div>
  );
}

export default function Developers() {
  useShellHeader({ title: "Partner API", subtitle: "Read-only JSON feed for partner portals such as IndusTech Connect" });
  const [col, setCol] = useState<Collection>("jobs");
  const [lang, setLang] = useState<"curl" | "js" | "php">("curl");

  const samples = {
    curl: `curl -s "${base}/${col}?status=open&limit=50" \\\n  -H "X-API-Key: YOUR_API_KEY"`,
    js: `const res = await fetch("${base}/${col}?updated_since=2026-09-01", {\n  headers: { "X-API-Key": process.env.DIGIBIZZ_API_KEY },\n});\nconst { data, meta, links } = await res.json();\n// follow links.next until it is null`,
    php: `$ch = curl_init("${base}/${col}?page=1");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: " . getenv("DIGIBIZZ_API_KEY")]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$body = json_decode(curl_exec($ch), true);`,
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: <Key className="size-5" />, t: "API key auth", d: "Send X-API-Key on every request. Keys are issued by DigiBizz admins." },
          { icon: <Lightning className="size-5" />, t: "4 collections", d: "Jobs (IT only), internships, programs/courses and trainings." },
          { icon: <Timer className="size-5" />, t: "Incremental sync", d: "Use updated_since + pagination to pull only what changed." },
          { icon: <ShieldCheck className="size-5" />, t: "240 req/min", d: "Per key. Responses are cacheable for 60 seconds." },
        ].map((c) => (
          <motion.div key={c.t} variants={fadeUp} className="panel p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">{c.icon}</span>
            <p className="mt-4 font-semibold">{c.t}</p>
            <p className="mt-1 text-sm text-muted">{c.d}</p>
          </motion.div>
        ))}
      </Stagger>

      <Reveal className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Base URL</h2>
            <code className="mt-1 block break-all font-mono text-sm text-brand">{base}</code>
          </div>
          <a href={`${base}/openapi.json`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2 text-sm font-medium hover:border-line-strong">
            <FileCode className="size-4" /> OpenAPI 3.1 spec
          </a>
        </div>
      </Reveal>

      <Reveal className="panel p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Endpoints</h2>
          <Segmented
            value={col}
            onChange={setCol}
            size="sm"
            options={[
              { value: "jobs", label: "Jobs" },
              { value: "internships", label: "Internships" },
              { value: "programs", label: "Programs" },
              { value: "trainings", label: "Trainings" },
            ]}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={col} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-5">
            <div className="space-y-2">
              {[`/${col}`, `/${col}/{id}`].map((p, i) => (
                <div key={p} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-well px-4 py-3">
                  <Badge tone="brand">GET</Badge>
                  <code className="font-mono text-sm">{p}</code>
                  <span className="text-sm text-muted">{i === 0 ? "Paginated list" : "One item by id or slug"}</span>
                  {col === "jobs" && i === 0 && <Badge tone="info">IT / IT-related only</Badge>}
                </div>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-line">
                  <div className="bg-well px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Query parameters</div>
                  {[
                    ["page", "Page number, default 1"],
                    ["limit", "1–100, default 50"],
                    ["status", "open (default) · closed · expired · all"],
                    ["updated_since", "ISO date or date-time for incremental sync"],
                    ["category", "government · international · private"],
                    ["city", "Exact city name, e.g. Quetta"],
                    ["q", "Keyword search"],
                    ...(col !== "jobs" ? [["it_only", "true to return only IT / IT-related items"]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[130px_1fr] gap-4 border-t border-line px-4 py-2.5 text-sm">
                      <code className="font-mono text-[12.5px] text-accent">{k}</code>
                      <span className="text-ink-soft">{v}</span>
                    </div>
                  ))}
                </div>
                <FieldTable heading={col === "jobs" ? "IndusTech field" : "Requested detail"} rows={col === "jobs" ? JOB_FIELDS : OTHER_FIELDS} />
              </div>
              <div className="space-y-4">
                <Segmented value={lang} onChange={setLang} size="sm" options={[{ value: "curl", label: "cURL" }, { value: "js", label: "JavaScript" }, { value: "php", label: "PHP" }]} />
                <Code lang={lang}>{samples[lang]}</Code>
                <Code lang="response · 200">{JSON.stringify({ data: [EXAMPLES[col]], meta: { collection: col, page: 1, limit: 50, total: 1, total_pages: 1, generated_at: "2026-09-25T09:00:00.000Z" }, links: { self: "…", next: null, prev: null } }, null, 2)}</Code>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </Reveal>

      <Reveal className="panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Apply links & attribution</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          <code className="font-mono text-brand">apply_link</code> sends the user to the DigiBizz application page with <code className="font-mono text-brand">?ref=&lt;your-partner-slug&gt;</code> attached, so every application you send us is credited to your portal. If an organization takes applications on its own website, <code className="font-mono text-brand">apply_link</code> points there instead. Errors use the shape{" "}
          <code className="font-mono text-ink-soft">{'{ "error": { "code", "message" } }'}</code> with status 401 (missing/invalid key), 403 (scope), 404 and 429 (rate limit).
        </p>
      </Reveal>
    </div>
  );
}
