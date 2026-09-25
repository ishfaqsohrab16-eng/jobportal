import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowSquareOut, Copy, DotsThree, Eye, Kanban, MagnifyingGlass, PencilSimple, Plus, Trash, Tray } from "@phosphor-icons/react";
import {
  deadlineLabel,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_META,
  type OpportunityDTO,
  type OpportunityStatus,
} from "@digibizz/jobs-shared";
import {
  useAdminOpportunitiesQuery,
  useDeleteOpportunityMutation,
  useDuplicateOpportunityMutation,
  useSetOpportunityStatusMutation,
} from "@/store/api";
import { useDebouncedValue, useToast, useUrlFilters } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { PublisherMark, TypeBadge } from "@/components/opportunity";
import { Badge, ButtonLink, ConfirmDialog, EmptyState, Input, Pagination, Segmented, Select, Skeleton } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";

const KEYS = ["q", "type", "status", "page"] as const;
const STATUS_STYLE: Record<OpportunityStatus, string> = {
  open: "bg-brand-soft text-brand",
  draft: "bg-surface-2 text-muted",
  closed: "bg-danger-soft text-danger",
};

function StatusMenu({ o }: { o: OpportunityDTO }) {
  const [open, setOpen] = useState(false);
  const [setStatus] = useSetOpportunityStatusMutation();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS_STYLE[o.status])}>
        <span className="size-1.5 rounded-full bg-current" />
        {o.status === "open" && o.publicStatus === "expired" ? "expired" : o.status}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="panel absolute left-0 top-full z-30 mt-1 w-36 p-1 shadow-2xl">
            {OPPORTUNITY_STATUSES.map((s) => (
              <button
                key={s}
                disabled={s === o.status}
                onClick={async () => {
                  setOpen(false);
                  try {
                    await setStatus({ id: o.id, status: s }).unwrap();
                    toast.success(`Marked as ${s}`);
                  } catch (err) {
                    toast.error("Couldn't update", errorMessage(err));
                  }
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm capitalize hover:bg-surface-2 disabled:opacity-40"
              >
                <span className={cn("size-2 rounded-full", s === "open" ? "bg-brand" : s === "closed" ? "bg-danger" : "bg-muted")} />
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RowActions({ o, onDelete }: { o: OpportunityDTO; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [duplicate] = useDuplicateOpportunityMutation();
  const navigate = useNavigate();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2";
  return (
    <div ref={ref} className="relative justify-self-end">
      <button onClick={() => setOpen((v) => !v)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label="Actions">
        <DotsThree weight="bold" className="size-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="panel absolute right-0 top-full z-30 mt-1 w-48 origin-top-right p-1 shadow-2xl">
            <Link to={`/admin/opportunities/${o.id}`} className={item}>
              <PencilSimple className="size-4" /> Edit
            </Link>
            <Link to={`/admin/applications?opportunity=${o.id}`} className={item}>
              <Tray className="size-4" /> Applications
            </Link>
            <a href={`/opportunities/${o.slug}`} target="_blank" rel="noreferrer" className={item}>
              <ArrowSquareOut className="size-4" /> View public page
            </a>
            <button
              className={item}
              onClick={async () => {
                setOpen(false);
                try {
                  const copy = await duplicate(o.id).unwrap();
                  toast.success("Duplicated as draft");
                  navigate(`/admin/opportunities/${copy.id}`);
                } catch (err) {
                  toast.error("Couldn't duplicate", errorMessage(err));
                }
              }}
            >
              <Copy className="size-4" /> Duplicate
            </button>
            <button
              className={cn(item, "text-danger hover:bg-danger-soft")}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash className="size-4" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Opportunities() {
  const { values, set } = useUrlFilters(KEYS);
  const [search, setSearch] = useState(values.q);
  const q = useDebouncedValue(search, 300);
  useEffect(() => {
    if (q !== values.q) set({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const page = Number(values.page) || 1;
  const { data, isLoading, isFetching } = useAdminOpportunitiesQuery({ ...values, page, limit: 15 });
  const [del, { isLoading: deleting }] = useDeleteOpportunityMutation();
  const [toDelete, setToDelete] = useState<OpportunityDTO | null>(null);
  const toast = useToast();

  useShellHeader({
    title: "Opportunities",
    subtitle: data ? `${data.total} total` : "Jobs, internships, programs & trainings",
    actions: (
      <ButtonLink to="/admin/opportunities/new" variant="primary" chip={<Plus weight="bold" className="size-3.5" />} className="hidden sm:inline-flex">
        New
      </ButtonLink>
    ),
  }, [data?.total]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 basis-56">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, skill or field" leading={<MagnifyingGlass className="size-4" />} className="h-10" />
          </div>
          <Segmented
            value={(values.type || "all") as "all"}
            onChange={(v) => set({ type: v === "all" ? "" : v })}
            size="sm"
            className="max-w-full overflow-x-auto scrollbar-none"
            options={[{ value: "all", label: "All" }, ...OPPORTUNITY_TYPES.map((t) => ({ value: t as "all", label: OPPORTUNITY_TYPE_META[t].plural }))]}
          />
          <div className="w-36">
            <Select value={values.status} onChange={(e) => set({ status: e.target.value })} className="h-10">
              <option value="">Any status</option>
              {OPPORTUNITY_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <ButtonLink to="/admin/opportunities/new" variant="primary" size="sm" className="h-10 sm:hidden" icon={<Plus className="size-4" />}>
            New
          </ButtonLink>
        </div>

        <div className="hidden grid-cols-[2.4fr_1fr_0.9fr_1.1fr_0.8fr_0.6fr_40px] gap-4 rounded-xl bg-well px-4 py-3 text-xs font-medium text-muted lg:grid">
          <span>Opportunity</span>
          <span>Type</span>
          <span>Status</span>
          <span>Deadline</span>
          <span>Applicants</span>
          <span>Views</span>
          <span />
        </div>

        {isLoading ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data?.items.length ? (
          <motion.ul animate={{ opacity: isFetching ? 0.6 : 1 }} className="divide-y divide-line">
            <AnimatePresence initial={false} mode="popLayout">
              {data.items.map((o, i) => (
                <motion.li
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-3.5 text-sm lg:grid-cols-[2.4fr_1fr_0.9fr_1.1fr_0.8fr_0.6fr_40px] lg:gap-4 lg:px-4"
                >
                  <Link to={`/admin/opportunities/${o.id}`} className="flex min-w-0 items-center gap-3">
                    <PublisherMark size={36} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold hover:text-brand">{o.title}</span>
                        {o.featured && <Badge tone="accent">★</Badge>}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {o.field || OPPORTUNITY_TYPE_META[o.type].label}
                        {!o.isITRelated && " · non-IT"}
                      </span>
                    </span>
                  </Link>
                  <span className="hidden lg:block">
                    <TypeBadge type={o.type} />
                  </span>
                  <span className="hidden lg:block">
                    <StatusMenu o={o} />
                  </span>
                  <span className={cn("hidden text-[13px] lg:block", o.publicStatus === "expired" ? "text-danger" : "text-ink-soft")}>{deadlineLabel(o.deadline)}</span>
                  <Link to={`/admin/applications?opportunity=${o.id}`} className="hidden font-semibold tabular-nums hover:text-brand lg:block">
                    {o.applicationsCount}
                  </Link>
                  <span className="hidden items-center gap-1 tabular-nums text-muted lg:flex">
                    <Eye className="size-3.5" /> {o.views}
                  </span>
                  <RowActions o={o} onDelete={() => setToDelete(o)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <EmptyState
            className="mt-4"
            icon={<Kanban className="size-7" />}
            title="No opportunities yet"
            body="Post your first job, internship, program or training."
            action={<ButtonLink to="/admin/opportunities/new" variant="primary">Create opportunity</ButtonLink>}
          />
        )}
        <div className="mt-5">
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={(p) => set({ page: String(p) })} />
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete opportunity?"
        body={toDelete ? `“${toDelete.title}” will be permanently deleted. Opportunities with applications can only be closed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del(toDelete.id).unwrap();
            toast.success("Deleted");
          } catch (err) {
            toast.error("Couldn't delete", errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}
