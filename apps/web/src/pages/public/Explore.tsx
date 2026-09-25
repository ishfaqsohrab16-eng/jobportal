import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowsDownUp, Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABEL,
  OPPORTUNITY_TYPE_META,
  WORK_MODES,
  WORK_MODE_LABEL,
  type OpportunityType,
} from "@digibizz/jobs-shared";
import { useFacetsQuery, useOpportunitiesQuery } from "@/store/api";
import { useDebouncedValue, useUrlFilters } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { OpportunityCard, OpportunityCardSkeleton, TYPE_ICON } from "@/components/opportunity";
import { Stagger } from "@/components/motion";
import { Badge, Button, Drawer, EmptyState, Input, Label, Pagination, Segmented, Select, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";

const KEYS = ["q", "category", "city", "workMode", "employmentType", "field", "it", "closingSoon", "sort", "page"] as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        "relative rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
        active ? "border-brand/50 text-brand" : "border-line text-ink-soft hover:border-line-strong",
      )}
    >
      {active && <motion.span layoutId="chip-bg" className="absolute inset-0 rounded-full bg-brand-soft" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
      <span className="relative">{children}</span>
    </motion.button>
  );
}

function Filters({ type, values, set }: { type: OpportunityType; values: Record<(typeof KEYS)[number], string>; set: (p: Partial<Record<(typeof KEYS)[number], string>>) => void }) {
  const { data: facets } = useFacetsQuery(type);
  return (
    <div className="space-y-6">
      <div>
        <Label>Offered by</Label>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!values.category} onClick={() => set({ category: "" })}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={values.category === c} onClick={() => set({ category: values.category === c ? "" : c })}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>City</Label>
        <Select value={values.city} onChange={(e) => set({ city: e.target.value })}>
          <option value="">Anywhere</option>
          {(facets?.cities ?? []).map((c) => (
            <option key={c.value} value={c.value}>
              {c.value} ({c.count})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Work mode</Label>
        <Segmented
          value={(values.workMode || "any") as "any"}
          onChange={(v) => set({ workMode: v === "any" ? "" : v })}
          size="sm"
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          options={[{ value: "any" as const, label: "Any" }, ...WORK_MODES.map((m) => ({ value: m as "any", label: WORK_MODE_LABEL[m] }))]}
        />
      </div>
      {(type === "job" || type === "internship") && (
        <div>
          <Label>Employment type</Label>
          <Select value={values.employmentType} onChange={(e) => set({ employmentType: e.target.value })}>
            <option value="">Any</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div>
        <Label>Field</Label>
        <Select value={values.field} onChange={(e) => set({ field: e.target.value })}>
          <option value="">All fields</option>
          {(facets?.fields ?? []).map((f) => (
            <option key={f.value} value={f.value}>
              {f.value} ({f.count})
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-4 rounded-2xl border border-line bg-well/60 p-4">
        <Switch checked={values.it === "1"} onChange={(v) => set({ it: v ? "1" : "" })} label="IT & tech only" description="Software, data, cloud, security…" />
        <Switch checked={values.closingSoon === "1"} onChange={(v) => set({ closingSoon: v ? "1" : "" })} label="Closing this week" description="Deadline within 7 days" />
      </div>
    </div>
  );
}

export default function Explore({ type }: { type: OpportunityType }) {
  const meta = OPPORTUNITY_TYPE_META[type];
  const { values, set, clear } = useUrlFilters(KEYS);
  const [search, setSearch] = useState(values.q);
  const debounced = useDebouncedValue(search, 350);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setSearch(values.q);
  }, [values.q]);
  useEffect(() => {
    if (debounced !== values.q) set({ q: debounced });
    // only react to the debounced text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const page = Number(values.page) || 1;
  const { data, isFetching, isLoading } = useOpportunitiesQuery({ type, ...values, page, limit: 12 });
  const active = KEYS.filter((k) => !["sort", "page", "q"].includes(k) && values[k]).length;

  useShellHeader({ title: meta.plural, subtitle: meta.blurb });

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="panel sticky top-4 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Funnel className="size-4" /> Filters
              </p>
              <AnimatePresence>
                {active > 0 && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={clear} className="text-xs font-medium text-brand hover:underline">
                    Clear all
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <Filters type={type} values={values} set={set} />
          </div>
        </aside>

        <section className="min-w-0">
          {/* Toolbar, styled after the dashboard table toolbar */}
          <div className="panel mb-5 flex flex-wrap items-center gap-2 p-2">
            <div className="min-w-0 flex-1 basis-60">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${meta.plural.toLowerCase()}…`}
                leading={<MagnifyingGlass className="size-4" />}
                trailing={
                  search ? (
                    <button onClick={() => setSearch("")} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Clear search">
                      <X className="size-3.5" />
                    </button>
                  ) : undefined
                }
                className="h-10 border-transparent bg-well"
              />
            </div>
            <Button size="sm" className="h-10 lg:hidden" icon={<Funnel className="size-4" />} onClick={() => setDrawer(true)}>
              Filter {active > 0 && <Badge tone="brand">{active}</Badge>}
            </Button>
            <div className="flex items-center gap-2">
              <ArrowsDownUp className="hidden size-4 text-muted sm:block" />
              <Segmented
                value={(values.sort || "newest") as "newest"}
                onChange={(v) => set({ sort: v === "newest" ? "" : v })}
                size="sm"
                options={[
                  { value: "newest", label: "Newest" },
                  { value: "deadline" as "newest", label: "Deadline" },
                  ...(type === "job" || type === "internship" ? [{ value: "salary" as "newest", label: "Salary" }] : []),
                ]}
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="text-brand">{TYPE_ICON[type]("size-4")}</span>
              {isLoading ? "Loading…" : (
                <span>
                  <motion.b key={data?.total} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-ink">
                    {data?.total ?? 0}
                  </motion.b>{" "}
                  {(data?.total ?? 0) === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()} found
                </span>
              )}
            </span>
            {isFetching && !isLoading && <span className="text-xs">Updating…</span>}
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <OpportunityCardSkeleton key={i} />
              ))}
            </div>
          ) : data?.items.length ? (
            <motion.div animate={{ opacity: isFetching ? 0.55 : 1 }} transition={{ duration: 0.2 }}>
              <Stagger key={`${JSON.stringify(values)}`} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" gap={0.05}>
                {data.items.map((o, i) => (
                  <OpportunityCard key={o.id} o={o} index={i} />
                ))}
              </Stagger>
            </motion.div>
          ) : (
            <EmptyState
              icon={TYPE_ICON[type]("size-7")}
              title={`No ${meta.plural.toLowerCase()} match`}
              body="Try removing a filter or searching for something broader."
              action={
                <Button onClick={clear} variant="primary">
                  Reset filters
                </Button>
              }
            />
          )}

          <div className="mt-8">
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={(p) => set({ page: String(p) })} />
          </div>
        </section>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters" footer={<Button variant="primary" onClick={() => setDrawer(false)}>Show {data?.total ?? 0} results</Button>}>
        <Filters type={type} values={values} set={set} />
        {active > 0 && (
          <Button variant="ghost" className="mt-4" onClick={clear}>
            Clear all filters
          </Button>
        )}
      </Drawer>
    </div>
  );
}
