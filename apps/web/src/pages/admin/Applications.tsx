import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { DownloadSimple, Envelope, MagnifyingGlass, Phone, Tray, X } from "@phosphor-icons/react";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  formatDate,
  type ApplicationDTO,
  type ApplicationStatus,
} from "@digibizz/jobs-shared";
import { useAdminApplicationsQuery, useAdminOpportunityQuery, useSetApplicationStatusMutation } from "@/store/api";
import { useDebouncedValue, useToast, useUrlFilters } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Avatar, Badge, Button, Drawer, EmptyState, Field, Input, Pagination, Select, Skeleton, Textarea } from "@/components/ui";
import { STATUS_TONE } from "@/pages/account/Dashboard";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";

const KEYS = ["opportunity", "status", "source", "q", "page"] as const;

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

export default function Applications() {
  const { values, set } = useUrlFilters(KEYS);
  const [search, setSearch] = useState(values.q);
  const q = useDebouncedValue(search, 300);
  useEffect(() => {
    if (q !== values.q) set({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const page = Number(values.page) || 1;
  const { data, isLoading, isFetching } = useAdminApplicationsQuery({ ...values, page, limit: 20 });
  const { data: opp } = useAdminOpportunityQuery(values.opportunity, { skip: !values.opportunity });
  const [selected, setSelected] = useState<ApplicationDTO | null>(null);

  useShellHeader({ title: "Applications", subtitle: opp ? `For “${opp.title}”` : data ? `${data.total} total` : "Inbox" }, [opp?.id, data?.total]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 basis-56">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidate name or email" leading={<MagnifyingGlass className="size-4" />} className="h-10" />
          </div>
          <div className="w-40">
            <Select value={values.status} onChange={(e) => set({ status: e.target.value })} className="h-10">
              <option value="">Any status</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Input value={values.source} onChange={(e) => set({ source: e.target.value.trim().toLowerCase() })} placeholder="Source e.g. industechconnect" className="h-10" />
          </div>
          <AnimatePresence>
            {values.opportunity && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => set({ opportunity: "" })} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-soft px-3 text-sm font-medium text-brand">
                One opportunity <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden grid-cols-[1.5fr_1.7fr_0.9fr_0.9fr_1fr] gap-4 rounded-xl bg-well px-4 py-3 text-xs font-medium text-muted lg:grid">
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
                      <span className="block truncate font-medium">{a.candidate?.name}</span>
                      <span className="block truncate text-xs text-muted">{a.candidate?.email}</span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{a.opportunity.title}</span>
                    <span className="block truncate text-xs text-muted">{a.opportunity.organizationName}</span>
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
          <EmptyState className="mt-4" icon={<Tray className="size-7" />} title="No applications" body="Applications that match these filters will show up here." />
        )}
        <div className="mt-5">
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={(p) => set({ page: String(p) })} />
        </div>
      </div>
      <Detail app={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
