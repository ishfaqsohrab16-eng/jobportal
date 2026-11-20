import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, DownloadSimple, Envelope, FileCsv, FilePdf, FileXls, FileZip, Funnel, MagnifyingGlass, Phone, Tray, X } from "@phosphor-icons/react";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  formatDate,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_META,
  type OpportunityType,
  type ApplicationDTO,
  type ApplicationStatus,
} from "@digibizz/jobs-shared";
import { useAdminApplicationsQuery, useAdminOpportunityQuery, useApplicationFacetsQuery, useSetApplicationStatusMutation } from "@/store/api";
import { useDebouncedValue, useToast, useUrlFilters } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Avatar, Badge, Button, Drawer, EmptyState, Field, Input, Modal, Pagination, Select, Skeleton, Spinner, Textarea } from "@/components/ui";
import { apiUrl, downloadFromApi } from "@/lib/download";
import { STATUS_TONE } from "@/pages/account/Dashboard";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";

const KEYS = ["opportunity", "type", "status", "source", "city", "resume", "minExperience", "from", "to", "sort", "q", "page"] as const;

function Detail({ app, onClose }: { app: ApplicationDTO | null; onClose: () => void }) {
  const [status, setStatus] = useState<ApplicationStatus>("reviewing");
  const [note, setNote] = useState("");
  const [update, { isLoading }] = useSetApplicationStatusMutation();
  const toast = useToast();
  useEffect(() => {
    if (app) {
      setStatus(app.status);
      setNote("");
    }
  }, [app]);

  return (
    <Drawer
      open={!!app}
      onClose={onClose}
      title="Application"
      width={560}
      footer={
        app && (
          <Button
            variant="primary"
            loading={isLoading}
            disabled={status === app.status && !note}
            onClick={async () => {
              try {
                await update({ id: app.id, status, note }).unwrap();
                toast.success("Status updated", APPLICATION_STATUS_LABEL[status]);
                onClose();
              } catch (err) {
                toast.error("Couldn't update", errorMessage(err));
              }
            }}
          >
            Save status
          </Button>
        )
      }
    >
      {app && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={app.candidate?.name ?? "?"} size={56} className="rounded-2xl" />
            <div className="min-w-0">
              <p className="text-lg font-semibold">{app.candidate?.name}</p>
              <p className="truncate text-sm text-muted">{app.candidate?.headline || "Candidate"}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={`mailto:${app.candidate?.email}`} className="flex items-center gap-2 rounded-xl bg-well p-3 text-sm hover:bg-surface-2">
              <Envelope className="size-4 text-muted" /> <span className="truncate">{app.candidate?.email}</span>
            </a>
            <a href={`tel:${app.phone}`} className="flex items-center gap-2 rounded-xl bg-well p-3 text-sm hover:bg-surface-2">
              <Phone className="size-4 text-muted" /> {app.phone}
              {app.city && <span className="text-muted">· {app.city}</span>}
            </a>
          </div>
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted">Applied for</p>
            <Link to={`/opportunities/${app.opportunity.slug}`} target="_blank" className="mt-1 block font-semibold hover:text-brand">
              {app.opportunity.title}
            </Link>
            <p className="text-muted">
              {app.opportunity.organizationName} · {formatDate(app.createdAt)} · via <span className={app.source !== "direct" ? "text-violet" : ""}>{app.source}</span>
            </p>
            {app.expectedSalary != null && <p className="mt-2">Expected: <b>PKR {app.expectedSalary.toLocaleString()}</b></p>}
          </div>
          {!!app.candidate?.skills.length && (
            <div className="flex flex-wrap gap-1.5">
              {app.candidate.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          )}
          {app.hasResume && (
            <a href={`/api/admin/applications/${app.id}/resume`} className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 text-sm font-medium transition-colors hover:bg-brand-soft">
              Download resume <DownloadSimple className="size-5 text-brand" />
            </a>
          )}
          {app.coverLetter && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted">Cover letter</p>
              <p className="prose-plain rounded-2xl bg-well p-4 text-sm">{app.coverLetter}</p>
            </div>
          )}
          <div className="space-y-3 rounded-2xl border border-line p-4">
            <Field label="Move to">
              {(id) => (
                <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {APPLICATION_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Note to candidate" hint="optional · shown in their timeline">
              {(id) => <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Interview on Monday at 11am" />}
            </Field>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-wider text-muted">History</p>
            <ol className="relative ml-2 space-y-4 border-l border-line pl-5">
              {app.history.map((h, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                  <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full border-2 border-paper bg-brand" />
                  <p className="text-sm font-medium">{APPLICATION_STATUS_LABEL[h.status]}</p>
                  <p className="text-xs text-muted">{new Date(h.at).toLocaleString("en-GB")}</p>
                  {h.note && <p className="mt-1 text-sm text-ink-soft">{h.note}</p>}
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Drawer>
  );
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Candidate name A–Z" },
] as const;

/** Every filter except paging - shared by the list and the exports. */
const filterParams = (v: Record<(typeof KEYS)[number], string>) => {
  const { page: _page, ...rest } = v;
  return rest;
};

function ExportDialog({ open, onClose, params, total }: { open: boolean; onClose: () => void; params: Record<string, string>; total: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const run = async (key: string, path: string, extra: Record<string, string>, name: string) => {
    setBusy(key);
    try {
      await downloadFromApi(apiUrl(path, { ...params, ...extra }), name);
      toast.success("Download started", name);
    } catch (err) {
      toast.error("Couldn't download", errorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  const options = [
    {
      key: "xlsx",
      icon: <FileXls weight="duotone" className="size-7 text-brand" />,
      title: "Excel spreadsheet",
      body: "Every column - contact details, opportunity, status, skills, salary, cover letter and a resume link.",
      action: () => run("xlsx", "/admin/applications/export", { format: "xlsx" }, "applications.xlsx"),
    },
    {
      key: "csv",
      icon: <FileCsv weight="duotone" className="size-7 text-teal" />,
      title: "CSV file",
      body: "The same columns as plain text, for Google Sheets or other tools.",
      action: () => run("csv", "/admin/applications/export", { format: "csv" }, "applications.csv"),
    },
    {
      key: "zip",
      icon: <FileZip weight="duotone" className="size-7 text-violet" />,
      title: "All resumes (ZIP)",
      body: "Every resume, in a folder per opportunity and named after the candidate, plus the Excel sheet as an index.",
      action: () => run("zip", "/admin/applications/resumes.zip", {}, "resumes.zip"),
    },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Export applications" description={`${total.toLocaleString()} application${total === 1 ? "" : "s"} match the current filters.`}>
      <div className="space-y-2.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={o.action}
            disabled={!!busy || total === 0}
            className="flex w-full items-center gap-4 rounded-2xl border border-line p-4 text-left transition-colors hover:border-brand/40 hover:bg-well/60 disabled:opacity-50"
          >
            {o.icon}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{o.title}</span>
              <span className="block text-sm text-muted">{o.body}</span>
            </span>
            {busy === o.key ? <Spinner className="size-5" /> : <DownloadSimple className="size-5 text-muted" />}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Exports include up to 10,000 applications. Change the filters to narrow them down.</p>
    </Modal>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      onClick={onClear}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 text-xs font-medium text-brand"
    >
      {label} <X className="size-3" />
    </motion.button>
  );
}

export default function Applications() {
  const { values, set, clear } = useUrlFilters(KEYS);
  const [search, setSearch] = useState(values.q);
  const q = useDebouncedValue(search, 300);
  useEffect(() => {
    if (q !== values.q) set({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const page = Number(values.page) || 1;
  const { data, isLoading, isFetching } = useAdminApplicationsQuery({ ...values, page, limit: 20 });
  const { data: facets } = useApplicationFacetsQuery();
  const { data: opp } = useAdminOpportunityQuery(values.opportunity, { skip: !values.opportunity });
  const [selected, setSelected] = useState<ApplicationDTO | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const statuses = values.status ? (values.status.split(",") as ApplicationStatus[]) : [];
  const toggleStatus = (s: ApplicationStatus) =>
    set({ status: (statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s]).join(",") });

  const chips: { label: string; clear: Partial<Record<(typeof KEYS)[number], string>> }[] = [];
  if (values.opportunity) chips.push({ label: opp?.title ?? "One opportunity", clear: { opportunity: "" } });
  if (values.type) chips.push({ label: OPPORTUNITY_TYPE_META[values.type as OpportunityType]?.plural ?? values.type, clear: { type: "" } });
  for (const s of statuses) chips.push({ label: APPLICATION_STATUS_LABEL[s] ?? s, clear: { status: statuses.filter((x) => x !== s).join(",") } });
  if (values.source) chips.push({ label: `Source: ${values.source}`, clear: { source: "" } });
  if (values.city) chips.push({ label: `City: ${values.city}`, clear: { city: "" } });
  if (values.resume) chips.push({ label: values.resume === "yes" ? "Has resume" : "No resume", clear: { resume: "" } });
  if (values.minExperience) chips.push({ label: `${values.minExperience}+ yrs experience`, clear: { minExperience: "" } });
  if (values.from) chips.push({ label: `From ${values.from}`, clear: { from: "" } });
  if (values.to) chips.push({ label: `To ${values.to}`, clear: { to: "" } });
  if (values.q) chips.push({ label: `“${values.q}”`, clear: { q: "" } });

  const advancedCount = [values.type, values.source, values.city, values.resume, values.minExperience, values.from, values.to].filter(Boolean).length;
  const [showMore, setShowMore] = useState(advancedCount > 0);

  useShellHeader(
    {
      title: "Applications",
      subtitle: opp ? `For “${opp.title}”` : data ? `${data.total} ${chips.length ? "matching" : "total"}` : "Inbox",
      actions: (
        <Button variant="primary" size="sm" icon={<DownloadSimple weight="bold" className="size-4" />} onClick={() => setExportOpen(true)}>
          <span className="hidden sm:inline">Export / download</span>
          <span className="sm:hidden">Export</span>
        </Button>
      ),
    },
    [opp?.id, data?.total, chips.length],
  );

  const opportunities = facets?.opportunities.filter((o) => !values.type || o.type === values.type) ?? [];

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 basis-56">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone or skill" leading={<MagnifyingGlass className="size-4" />} className="h-10" />
          </div>
          <div className="min-w-0 flex-1 basis-56 sm:max-w-xs">
            <Select value={values.opportunity} onChange={(e) => set({ opportunity: e.target.value })} className="h-10" aria-label="Opportunity">
              <option value="">All opportunities</option>
              {values.opportunity && !opportunities.some((o) => o.id === values.opportunity) && <option value={values.opportunity}>{opp?.title ?? "Selected opportunity"}</option>}
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} · {OPPORTUNITY_TYPE_META[o.type].label} ({o.applications})
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Select value={values.sort || "newest"} onChange={(e) => set({ sort: e.target.value === "newest" ? "" : e.target.value })} className="h-10" aria-label="Sort">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <Button variant={showMore ? "outline" : "secondary"} icon={<Funnel className="size-4" />} onClick={() => setShowMore((v) => !v)}>
            More filters
            {advancedCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] font-semibold text-[#04120b]">{advancedCount}</span>}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Status">
          {APPLICATION_STATUSES.map((s) => {
            const on = statuses.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                aria-pressed={on}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {on && <Check weight="bold" className="size-3" />}
                {APPLICATION_STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {showMore && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 grid gap-3 rounded-2xl bg-well/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Type">
                  {(id) => (
                    <Select id={id} value={values.type} onChange={(e) => set({ type: e.target.value, opportunity: "" })}>
                      <option value="">Any type</option>
                      {OPPORTUNITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {OPPORTUNITY_TYPE_META[t].plural}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Source">
                  {(id) => (
                    <Select id={id} value={values.source} onChange={(e) => set({ source: e.target.value })}>
                      <option value="">Any source</option>
                      {facets?.sources.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="City">
                  {(id) => (
                    <Select id={id} value={values.city} onChange={(e) => set({ city: e.target.value })}>
                      <option value="">Any city</option>
                      {facets?.cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Resume">
                  {(id) => (
                    <Select id={id} value={values.resume} onChange={(e) => set({ resume: e.target.value })}>
                      <option value="">Any</option>
                      <option value="yes">Has a resume</option>
                      <option value="no">No resume</option>
                    </Select>
                  )}
                </Field>
                <Field label="Minimum experience">
                  {(id) => (
                    <Select id={id} value={values.minExperience} onChange={(e) => set({ minExperience: e.target.value })}>
                      <option value="">Any</option>
                      {[1, 2, 3, 5, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}+ years
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Applied from">
                  {(id) => <Input id={id} type="date" value={values.from} max={values.to || undefined} onChange={(e) => set({ from: e.target.value })} />}
                </Field>
                <Field label="Applied to">
                  {(id) => <Input id={id} type="date" value={values.to} min={values.from || undefined} onChange={(e) => set({ to: e.target.value })} />}
                </Field>
                <div className="flex items-end gap-2">
                  {(
                    [
                      ["Last 7 days", 7],
                      ["30 days", 30],
                    ] as const
                  ).map(([label, days]) => (
                    <Button
                      key={days}
                      size="sm"
                      variant="ghost"
                      className="h-10"
                      onClick={() => set({ from: new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10), to: "" })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {chips.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex flex-wrap items-center gap-1.5">
              <AnimatePresence>
                {chips.map((c) => (
                  <FilterChip
                    key={c.label}
                    label={c.label}
                    onClear={() => {
                      if ("q" in c.clear) setSearch("");
                      set(c.clear);
                    }}
                  />
                ))}
              </AnimatePresence>
              <button
                onClick={() => {
                  clear();
                  setSearch("");
                }}
                className="ml-1 text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 hidden grid-cols-[1.5fr_1.7fr_0.9fr_0.9fr_1fr] gap-4 rounded-xl bg-well px-4 py-3 text-xs font-medium text-muted lg:grid">
          <span>Candidate</span>
          <span>Opportunity</span>
          <span>Source</span>
          <span>Applied</span>
          <span>Status</span>
        </div>

        {isLoading ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data?.items.length ? (
          <motion.ul animate={{ opacity: isFetching ? 0.6 : 1 }} className="divide-y divide-line">
            {data.items.map((a, i) => (
              <motion.li key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <button onClick={() => setSelected(a)} className="grid w-full grid-cols-1 gap-2 rounded-xl px-2 py-3.5 text-left text-sm transition-colors hover:bg-well/60 lg:grid-cols-[1.5fr_1.7fr_0.9fr_0.9fr_1fr] lg:items-center lg:gap-4 lg:px-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.candidate?.name ?? "?"} size={34} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate font-medium">
                        {a.candidate?.name}
                        {a.hasResume && <FilePdf weight="fill" className="size-3.5 shrink-0 text-danger" aria-label="Has resume" />}
                      </span>
                      <span className="block truncate text-xs text-muted">{a.candidate?.email}</span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{a.opportunity.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {OPPORTUNITY_TYPE_META[a.opportunity.type]?.label ?? a.opportunity.type}
                      {a.city && ` · ${a.city}`}
                    </span>
                  </span>
                  <span className={cn("truncate", a.source !== "direct" ? "font-medium text-violet" : "text-muted")}>{a.source}</span>
                  <span className="text-muted">{formatDate(a.createdAt)}</span>
                  <span>
                    <Badge tone={STATUS_TONE[a.status]} dot>
                      {APPLICATION_STATUS_LABEL[a.status]}
                    </Badge>
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <EmptyState
            className="mt-4"
            icon={<Tray className="size-7" />}
            title="No applications"
            body={chips.length ? "Nothing matches these filters. Try removing some." : "Applications will show up here."}
          />
        )}
        <div className="mt-5">
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={(p) => set({ page: String(p) })} />
        </div>
      </div>
      <Detail app={selected} onClose={() => setSelected(null)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} params={filterParams(values)} total={data?.total ?? 0} />
    </div>
  );
}
