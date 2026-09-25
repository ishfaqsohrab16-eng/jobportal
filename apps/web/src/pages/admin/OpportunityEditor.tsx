import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { ArrowLeft, Check, Eye, FloppyDisk, RocketLaunch } from "@phosphor-icons/react";
import {
  CITIES,
  derivePublicStatus,
  DIGIBIZZ,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABEL,
  FIELDS,
  GENDERS,
  GENDER_LABEL,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_META,
  opportunitySchema,
  SALARY_PERIODS,
  SALARY_PERIOD_LABEL,
  WORK_MODES,
  WORK_MODE_LABEL,
  type OpportunityDTO,
  type OpportunityInput,
  type OpportunityStatus,
} from "@digibizz/jobs-shared";
import { useAdminOpportunityQuery, useSaveOpportunityMutation } from "@/store/api";
import { useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { OpportunityCard, PublisherMark, TYPE_ICON, TYPE_TINT } from "@/components/opportunity";
import { Button, ButtonLink, Field, Input, LinesInput, Select, Skeleton, Switch, TagInput, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { errorMessage, fieldErrors } from "@/lib/errors";

const EMPTY: OpportunityInput = {
  type: "job",
  title: "",
  isITRelated: true,
  field: "",
  summary: "",
  description: "",
  responsibilities: [],
  requirements: [],
  eligibility: "",
  skills: [],
  education: "",
  qualification: "",
  experienceMinYears: null,
  experienceMaxYears: null,
  gender: "any",
  ageMin: null,
  ageMax: null,
  country: "Pakistan",
  city: "",
  address: "",
  workMode: "onsite",
  employmentType: "full_time",
  positions: 1,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: "PKR",
  salaryPeriod: "month",
  salaryNegotiable: false,
  contractDuration: "",
  duration: "",
  fee: null,
  certification: "",
  benefits: [],
  startDate: "",
  deadline: "",
  status: "draft",
  featured: false,
};

function toInput(o: OpportunityDTO): OpportunityInput {
  const { id: _i, slug: _s, organization: _o, publicStatus: _p, views: _v, applicationsCount: _a, publishedAt: _pa, createdAt: _c, updatedAt: _u, viewer: _vw, ...rest } = o;
  const { category: _cat, ...input } = rest;
  return { ...input, startDate: o.startDate ?? "", deadline: o.deadline ?? "" };
}

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "details", label: "Description" },
  { id: "requirements", label: "Requirements" },
  { id: "compensation", label: "Compensation" },
  { id: "location", label: "Location" },
  { id: "dates", label: "Dates" },
  { id: "publish", label: "Publishing" },
];

const num = { setValueAs: (v: unknown) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v)) };

function Section({ id, title, subtitle, children, index }: { id: string; title: string; subtitle?: string; children: React.ReactNode; index: number }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }} className="panel scroll-mt-6 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-xs font-bold text-muted">{index + 1}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids]);
  return active;
}

export default function OpportunityEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const { data: existing, isLoading } = useAdminOpportunityQuery(id ?? "", { skip: isNew });
  const [save, { isLoading: saving }] = useSaveOpportunityMutation();

  const form = useForm<OpportunityInput>({ resolver: zodResolver(opportunitySchema), defaultValues: EMPTY, mode: "onTouched" });
  const { register, control, handleSubmit, reset, setValue, setError, formState } = form;
  const e = formState.errors;

  const values = useWatch({ control }) as OpportunityInput;

  useEffect(() => {
    if (existing) reset(toInput(existing));
  }, [existing, reset]);

  const type = values.type ?? "job";
  const isLearning = type === "program" || type === "training";
  const active = useScrollSpy(useMemo(() => SECTIONS.map((s) => s.id), []));

  useShellHeader(
    {
      title: isNew ? "New opportunity" : (existing?.title ?? "Edit opportunity"),
      subtitle: isNew ? "Publish a job, internship, program or training" : `Last updated ${existing ? new Date(existing.updatedAt).toLocaleString("en-GB") : ""}`,
    },
    [existing?.id],
  );

  const submit = (status: OpportunityStatus) =>
    handleSubmit(
      async (data) => {
        try {
          const saved = await save({ id, body: { ...data, status } }).unwrap();
          toast.success(status === "open" ? "Published" : "Saved", saved.title);
          if (isNew) navigate(`/admin/opportunities/${saved.id}`, { replace: true });
        } catch (err) {
          for (const [k, v] of Object.entries(fieldErrors(err))) setError(k as FieldPath<OpportunityInput>, { message: v });
          toast.error("Couldn't save", errorMessage(err));
        }
      },
      () => toast.error("Please fix the highlighted fields"),
    )();

  const preview: OpportunityDTO | null = useMemo(() => {
    if (!values) return null;
    return {
      ...(EMPTY as unknown as OpportunityDTO),
      ...(values as unknown as OpportunityDTO),
      id: "preview",
      slug: existing?.slug ?? "preview",
      title: values.title || "Untitled opportunity",
      organization: { id: DIGIBIZZ.slug, name: DIGIBIZZ.name, slug: DIGIBIZZ.slug, category: DIGIBIZZ.category, logoUrl: "/logo.svg", verified: true },
      category: DIGIBIZZ.category,
      employmentType: values.employmentType ?? null,
      startDate: values.startDate || null,
      deadline: values.deadline || null,
      publicStatus: derivePublicStatus("open", values.deadline || null),
      views: 0,
      applicationsCount: 0,
      publishedAt: null,
      createdAt: "",
      updatedAt: "",
    } as OpportunityDTO;
  }, [values, existing?.slug]);

  if (!isNew && isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/opportunities" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All opportunities
        </Link>
        <div className="flex gap-2">
          {existing && (
            <ButtonLink to={`/opportunities/${existing.slug}`} target="_blank" size="sm" icon={<Eye className="size-4" />}>
              View
            </ButtonLink>
          )}
          <Button size="sm" loading={saving} onClick={() => submit("draft")} icon={<FloppyDisk className="size-4" />}>
            Save draft
          </Button>
          <Button size="sm" variant="primary" loading={saving} onClick={() => submit("open")} icon={<RocketLaunch className="size-4" />}>
            {existing?.status === "open" ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[180px_1fr_340px]">
        {/* Section nav */}
        <nav className="hidden xl:block">
          <ul className="sticky top-4 space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={cn("relative block rounded-lg px-3 py-2 text-sm transition-colors", active === s.id ? "font-medium text-ink" : "text-muted hover:text-ink-soft")}>
                  {active === s.id && <motion.span layoutId="editor-nav" className="absolute inset-0 rounded-lg bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <span className="relative">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <form className="min-w-0 space-y-5" onSubmit={(ev) => ev.preventDefault()}>
          <Section id="basics" title="Basics" subtitle={`What is ${DIGIBIZZ.name} offering?`} index={0}>
            <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {OPPORTUNITY_TYPES.map((t) => (
                <motion.button
                  type="button"
                  key={t}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setValue("type", t, { shouldDirty: true });
                    if (t === "program" || t === "training") setValue("employmentType", null);
                  }}
                  className={cn("relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors", type === t ? "border-transparent" : "border-line hover:border-line-strong")}
                  style={type === t ? { background: `color-mix(in oklab, ${TYPE_TINT[t].var} 14%, var(--surface))` } : undefined}
                >
                  {type === t && <motion.span layoutId="type-ring" className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: TYPE_TINT[t].var }} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                  <span style={{ color: TYPE_TINT[t].var }}>{TYPE_ICON[t]("size-6")}</span>
                  <span className="text-sm font-semibold">{OPPORTUNITY_TYPE_META[t].label}</span>
                  {type === t && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 grid size-5 place-items-center rounded-full text-black" style={{ background: TYPE_TINT[t].var }}>
                      <Check weight="bold" className="size-3" />
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2" error={e.title?.message}>
                {(fid) => <Input id={fid} {...register("title")} placeholder={type === "job" ? "e.g. Senior React Developer" : `e.g. ${OPPORTUNITY_TYPE_META[type].label} name`} invalid={!!e.title} />}
              </Field>
              <div className="flex items-center gap-3 rounded-xl border border-line bg-well/60 p-3 sm:col-span-2">
                <PublisherMark size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Published by {DIGIBIZZ.name}</p>
                  <p className="text-xs text-muted">Every opportunity on this portal is DigiBizz's own.</p>
                </div>
              </div>
              <Field label="Field">
                {(fid) => (
                  <Select id={fid} {...register("field")}>
                    <option value="">Select field</option>
                    {FIELDS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="flex items-end">
                <Controller
                  control={control}
                  name="isITRelated"
                  render={({ field }) => (
                    <div className="w-full rounded-xl border border-line bg-well/60 p-3">
                      <Switch checked={!!field.value} onChange={field.onChange} label="IT / IT-related" description="Included in the IndusTech jobs feed" />
                    </div>
                  )}
                />
              </div>
            </div>
          </Section>

          <Section id="details" title="Description" subtitle="Plain text; line breaks are kept." index={1}>
            <div className="space-y-4">
              <Field label="One-line summary" hint="optional · shown in listings">
                {(fid) => <Input id={fid} maxLength={300} {...register("summary")} />}
              </Field>
              <Field label="Full description" error={e.description?.message}>
                {(fid) => <Textarea id={fid} rows={8} {...register("description")} invalid={!!e.description} />}
              </Field>
              {!isLearning && (
                <Field label="Responsibilities" hint="one per line">
                  {(fid) => <Controller control={control} name="responsibilities" render={({ field }) => <LinesInput key={existing?.id ?? "new"} id={fid} value={field.value ?? []} onChange={field.onChange} />} />}
                </Field>
              )}
            </div>
          </Section>

          <Section id="requirements" title="Requirements" subtitle="Eligibility, education, experience and skills" index={2}>
            <div className="grid gap-4 sm:grid-cols-2">
              {type !== "job" && (
                <Field label="Eligibility" className="sm:col-span-2">
                  {(fid) => <Textarea id={fid} rows={3} {...register("eligibility")} placeholder="Who can apply?" />}
                </Field>
              )}
              <Field label="Requirements" className="sm:col-span-2" hint="one per line">
                {(fid) => <Controller control={control} name="requirements" render={({ field }) => <LinesInput key={existing?.id ?? "new"} id={fid} value={field.value ?? []} onChange={field.onChange} />} />}
              </Field>
              <Field label="Education">
                {(fid) => <Input id={fid} {...register("education")} placeholder="e.g. Bachelor's (16 years)" />}
              </Field>
              <Field label="Qualification">
                {(fid) => <Input id={fid} {...register("qualification")} placeholder="e.g. BS Computer Science" />}
              </Field>
              {type === "job" && (
                <>
                  <Field label="Min. experience (years)" error={e.experienceMinYears?.message}>
                    {(fid) => <Input id={fid} type="number" min={0} {...register("experienceMinYears", num)} />}
                  </Field>
                  <Field label="Max. experience (years)" error={e.experienceMaxYears?.message}>
                    {(fid) => <Input id={fid} type="number" min={0} {...register("experienceMaxYears", num)} />}
                  </Field>
                </>
              )}
              <Field label="Gender">
                {(fid) => (
                  <Select id={fid} {...register("gender")}>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {GENDER_LABEL[g]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min. age" error={e.ageMin?.message}>
                  {(fid) => <Input id={fid} type="number" min={0} {...register("ageMin", num)} />}
                </Field>
                <Field label="Max. age" error={e.ageMax?.message}>
                  {(fid) => <Input id={fid} type="number" min={0} {...register("ageMax", num)} />}
                </Field>
              </div>
              <Field label="Skills" className="sm:col-span-2" hint="Enter after each">
                {(fid) => <Controller control={control} name="skills" render={({ field }) => <TagInput id={fid} value={field.value ?? []} onChange={field.onChange} />} />}
              </Field>
            </div>
          </Section>

          <Section id="compensation" title={isLearning ? "Seats, fee & certification" : "Compensation"} index={3}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={isLearning ? "Seats" : "Number of positions"} error={e.positions?.message}>
                {(fid) => <Input id={fid} type="number" min={1} {...register("positions", { valueAsNumber: true })} />}
              </Field>
              {(type === "job" || type === "internship") && (
                <Field label="Employment type">
                  {(fid) => (
                    <Select id={fid} {...register("employmentType", { setValueAs: (v) => v || null })}>
                      <option value="">—</option>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {EMPLOYMENT_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              {isLearning && (
                <Field label="Fee" hint="0 = free">
                  {(fid) => <Input id={fid} type="number" min={0} {...register("fee", num)} />}
                </Field>
              )}
              <Field label={isLearning ? "Stipend min (optional)" : type === "internship" ? "Stipend min" : "Salary min"} error={e.salaryMin?.message}>
                {(fid) => <Input id={fid} type="number" min={0} {...register("salaryMin", num)} />}
              </Field>
              <Field label={isLearning ? "Stipend max (optional)" : type === "internship" ? "Stipend max" : "Salary max"} error={e.salaryMax?.message}>
                {(fid) => <Input id={fid} type="number" min={0} {...register("salaryMax", num)} />}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency" error={e.salaryCurrency?.message}>
                  {(fid) => <Input id={fid} maxLength={3} {...register("salaryCurrency")} className="uppercase" />}
                </Field>
                <Field label="Period">
                  {(fid) => (
                    <Select id={fid} {...register("salaryPeriod")}>
                      {SALARY_PERIODS.map((p) => (
                        <option key={p} value={p}>
                          {SALARY_PERIOD_LABEL[p]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="flex items-end">
                <Controller control={control} name="salaryNegotiable" render={({ field }) => <div className="w-full rounded-xl border border-line bg-well/60 p-3"><Switch checked={!!field.value} onChange={field.onChange} label="Negotiable" /></div>} />
              </div>
              {type === "job" ? (
                <Field label="Contract duration" hint="e.g. Permanent, 1 year">
                  {(fid) => <Input id={fid} {...register("contractDuration")} />}
                </Field>
              ) : (
                <Field label="Duration" hint="e.g. 3 months">
                  {(fid) => <Input id={fid} {...register("duration")} />}
                </Field>
              )}
              {isLearning && (
                <Field label="Certification">
                  {(fid) => <Input id={fid} {...register("certification")} />}
                </Field>
              )}
              <Field label={isLearning ? "What participants get" : "Benefits"} className="sm:col-span-2" hint="Enter after each">
                {(fid) => <Controller control={control} name="benefits" render={({ field }) => <TagInput id={fid} value={field.value ?? []} onChange={field.onChange} placeholder="Medical insurance, Laptop…" />} />}
              </Field>
            </div>
          </Section>

          <Section id="location" title="Location" index={4}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Country" error={e.country?.message}>
                {(fid) => <Input id={fid} {...register("country")} />}
              </Field>
              <Field label="City">
                {(fid) => (
                  <>
                    <Input id={fid} list="cities" {...register("city")} />
                    <datalist id="cities">
                      {CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Field label="Work mode">
                {(fid) => (
                  <Select id={fid} {...register("workMode")}>
                    {WORK_MODES.map((m) => (
                      <option key={m} value={m}>
                        {WORK_MODE_LABEL[m]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Address" className="sm:col-span-3" hint="optional">
                {(fid) => <Input id={fid} {...register("address")} />}
              </Field>
            </div>
          </Section>

          <Section id="dates" title="Dates" subtitle="Candidates apply on this portal" index={5}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application deadline" hint="inclusive · empty = rolling" error={e.deadline?.message}>
                {(fid) => <Input id={fid} type="date" {...register("deadline")} />}
              </Field>
              <Field label="Start date" hint="optional" error={e.startDate?.message}>
                {(fid) => <Input id={fid} type="date" {...register("startDate")} />}
              </Field>
            </div>
          </Section>

          <Section id="publish" title="Publishing" index={6}>
            <Controller control={control} name="featured" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Feature on the home page" description="Featured items appear first in listings" />} />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button loading={saving} onClick={() => submit("draft")} icon={<FloppyDisk className="size-4" />}>
                Save as draft
              </Button>
              <Button variant="primary" loading={saving} onClick={() => submit("open")} icon={<RocketLaunch className="size-4" />}>
                {existing?.status === "open" ? "Update listing" : "Publish now"}
              </Button>
            </div>
          </Section>
        </form>

        {/* Live preview */}
        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              Live preview
            </p>
            <div className="pointer-events-none">{preview && <OpportunityCard o={preview} />}</div>
            <p className="text-xs text-muted">This is how the listing card will look on the portal and in partner feeds.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
