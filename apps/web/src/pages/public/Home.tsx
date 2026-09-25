import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, CaretLeft, CaretRight, Lightning, MagnifyingGlass, MapPin, Sparkle } from "@phosphor-icons/react";
import {
  CITIES,
  DIGIBIZZ,
  OPPORTUNITY_TYPE_META,
  OPPORTUNITY_TYPES,
  type OpportunityType,
} from "@digibizz/jobs-shared";
import { useFacetsQuery, useOpportunitiesQuery, useStatsQuery } from "@/store/api";
import { useShellHeader } from "@/components/layout/ShellContext";
import { CountUp, Meter, MiniBars, Reveal, Stagger, WordReveal } from "@/components/motion";
import { OpportunityCard, OpportunityCardSkeleton, PublisherMark, TYPE_ICON, TYPE_TINT, DeadlinePill } from "@/components/opportunity";
import { Badge, Button, ButtonLink, EmptyState, PanelHeader, Segmented, Select, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ease, panelIntro } from "@/lib/motion";

/* ---------------------------------------------------------------- hero */

function SearchConsole() {
  const navigate = useNavigate();
  const [type, setType] = useState<OpportunityType>("job");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city) p.set("city", city);
    navigate(`/${OPPORTUNITY_TYPE_META[type].path}${p.size ? `?${p}` : ""}`);
  };
  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.7, ease }}
      className="panel mt-8 p-2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)]"
    >
      <Segmented
        value={type}
        onChange={setType}
        size="sm"
        className="mb-2 w-full overflow-x-auto scrollbar-none"
        options={OPPORTUNITY_TYPES.map((t) => ({ value: t, label: OPPORTUNITY_TYPE_META[t].plural }))}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-12 flex-1 items-center gap-2.5 rounded-xl bg-well px-3.5 focus-within:ring-2 focus-within:ring-brand/40">
          <MagnifyingGlass className="size-5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or skill" className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" />
        </label>
        <div className="sm:w-44">
          <Select value={city} onChange={(e) => setCity(e.target.value)} className="h-12" aria-label="City">
            <option value="">Any city</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="primary" size="lg" className="h-12" icon={<MagnifyingGlass weight="bold" className="size-4" />}>
          Search
        </Button>
      </div>
    </motion.form>
  );
}

function FloatingStack() {
  const { data } = useOpportunitiesQuery({ featured: "1", limit: 3 });
  const items = data?.items ?? [];
  const positions = [
    { x: 0, y: 0, r: -4, z: 3 },
    { x: 60, y: 110, r: 3, z: 2 },
    { x: -20, y: 225, r: -2, z: 1 },
  ];
  return (
    <div className="relative hidden h-[400px] lg:block" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_22%,transparent),transparent)] blur-2xl" />
      {items.map((o, i) => {
        const p = positions[i]!;
        const tint = TYPE_TINT[o.type].var;
        return (
          <motion.div
            key={o.id}
            className="absolute left-8 w-[300px]"
            style={{ zIndex: p.z }}
            initial={{ opacity: 0, y: p.y + 60, rotate: 0, x: p.x }}
            animate={{ opacity: 1, y: [p.y, p.y - 10, p.y], rotate: p.r, x: p.x }}
            transition={{
              opacity: { delay: 0.5 + i * 0.15, duration: 0.6 },
              rotate: { delay: 0.5 + i * 0.15, type: "spring", stiffness: 80 },
              y: { delay: 1.2 + i * 0.3, duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <Link to={`/opportunities/${o.slug}`} className="panel glow-corner block p-4 shadow-2xl" style={{ ["--tint" as string]: tint }}>
              <div className="flex items-center gap-3">
                <PublisherMark size={38} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-muted">{DIGIBIZZ.name}</p>
                  <p className="truncate text-sm font-semibold">{o.title}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={TYPE_TINT[o.type].tone}>{OPPORTUNITY_TYPE_META[o.type].label}</Badge>
                <DeadlinePill deadline={o.deadline} />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function Hero() {
  const { data: stats } = useStatsQuery();
  const total = stats ? Object.values(stats.open).reduce((a, b) => a + b, 0) : null;
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-6 lg:pt-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid text-ink opacity-50 mask-fade-b" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-10 size-[420px] animate-aurora rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_20%,transparent),transparent)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 size-[380px] animate-aurora rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--violet)_16%,transparent),transparent)] blur-3xl [animation-delay:-6s]" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 py-1 pl-1 pr-3 text-[12.5px] text-ink-soft backdrop-blur"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-[#04120b]">
              <Sparkle weight="fill" className="size-3" /> Official
            </span>
            {total != null ? (
              <>
                <CountUp value={total} /> open DigiBizz positions right now
              </>
            ) : (
              "DigiBizz Balochistan opportunities"
            )}
          </motion.span>
          <h2 className="mt-5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl xl:text-7xl">
            <WordReveal text="Find work that moves Balochistan forward." highlight={["Balochistan"]} delay={0.1} />
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted sm:text-lg"
          >
            The official DigiBizz Balochistan portal for our own jobs, internships, programs & courses and trainings — one profile, one place to apply.
          </motion.p>
          <SearchConsole />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            Popular:
            {["React", "Cybersecurity", "Freelancing", "Data", "DevOps"].map((s, i) => (
              <motion.span key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.06 }}>
                <Link to={`/jobs?q=${encodeURIComponent(s)}`} className="rounded-full border border-line px-2.5 py-1 transition-colors hover:border-brand hover:text-brand">
                  {s}
                </Link>
              </motion.span>
            ))}
          </motion.div>
        </div>
        <FloatingStack />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- KPI row */

const BAR_SHAPES: Record<OpportunityType, number[]> = {
  job: [4, 7, 5, 9, 6, 11, 8],
  internship: [3, 5, 8, 4, 9, 6, 10],
  program: [6, 4, 7, 10, 5, 8, 9],
  training: [5, 9, 6, 7, 11, 6, 8],
};

const KPI_LABEL: Record<OpportunityType, string> = {
  job: "Job openings",
  internship: "Internship seats",
  program: "Program seats",
  training: "Training seats",
};

function TypeKpis() {
  const { data: stats, isLoading } = useStatsQuery();
  return (
    <section className="px-4 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {OPPORTUNITY_TYPES.map((t, i) => {
          const meta = OPPORTUNITY_TYPE_META[t];
          const tint = TYPE_TINT[t].var;
          return (
            <motion.div key={t} custom={i} variants={panelIntro} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Link
                to={`/${meta.path}`}
                className="panel glow-corner group relative flex h-full items-end justify-between gap-3 overflow-hidden p-5 transition-colors hover:border-line-strong"
                style={{
                  ["--tint" as string]: tint,
                  background: `linear-gradient(160deg, color-mix(in oklab, ${tint} 14%, var(--surface)), var(--surface) 65%)`,
                }}
              >
                <div className="relative">
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <span style={{ color: tint }}>{TYPE_ICON[t]("size-4")}</span>
                    {KPI_LABEL[t]}
                  </p>
                  <div className="mt-6 font-display text-[34px] font-semibold leading-none tracking-tight">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : <CountUp value={stats?.open[t] ?? 0} />}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[12.5px] text-muted transition-colors group-hover:text-ink">
                    Browse all <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </div>
                <MiniBars values={BAR_SHAPES[t]} tint={tint} height={78} className="relative w-24 shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------ featured grid */

function Featured() {
  const [type, setType] = useState<OpportunityType | "all">("all");
  const { data, isFetching } = useOpportunitiesQuery({ limit: 6, ...(type === "all" ? { featured: "1" } : { type }) });
  const items = data?.items ?? [];
  return (
    <section className="px-4 sm:px-6">
      <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brand">Hand-picked</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">Featured opportunities</h2>
        </div>
        <Segmented
          value={type}
          onChange={setType}
          size="sm"
          className="max-w-full overflow-x-auto scrollbar-none"
          options={[{ value: "all" as const, label: "Featured" }, ...OPPORTUNITY_TYPES.map((t) => ({ value: t, label: OPPORTUNITY_TYPE_META[t].plural }))]}
        />
      </Reveal>
      <AnimatePresence mode="wait">
        <motion.div key={type} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {isFetching && !items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <OpportunityCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length ? (
            <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((o, i) => (
                <OpportunityCard key={o.id} o={o} index={i} />
              ))}
            </Stagger>
          ) : (
            <EmptyState title="Nothing here yet" body="New opportunities are published every week — check back soon." />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="mt-6 flex justify-center">
        <ButtonLink to={type === "all" ? "/jobs" : `/${OPPORTUNITY_TYPE_META[type].path}`} variant="secondary" chip={<ArrowRight className="size-3.5" />}>
          View all
        </ButtonLink>
      </div>
    </section>
  );
}

/* ---------------------------------------- closing soon (week strip) */

function ClosingSoon() {
  const { data, isLoading } = useOpportunitiesQuery({ closingSoon: "1", sort: "deadline", limit: 50 });
  const [offset, setOffset] = useState(0);
  const days = useMemo(() => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: 6 }, (_, i) => new Date(start.getTime() + (i + offset) * 86_400_000));
  }, [offset]);
  const [selected, setSelected] = useState<string | null>(null);
  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of data?.items ?? []) if (o.deadline) m.set(o.deadline, (m.get(o.deadline) ?? 0) + 1);
    return m;
  }, [data]);
  const list = (data?.items ?? []).filter((o) => !selected || o.deadline === selected).slice(0, 4);
  const month = days[0]!.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="panel flex flex-col p-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setOffset((o) => Math.max(0, o - 6))} disabled={offset === 0} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Previous days">
          <CaretLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold">{month}</p>
        <button onClick={() => setOffset((o) => Math.min(6, o + 6))} disabled={offset >= 6} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Next days">
          <CaretRight className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1 text-center">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const count = byDay.get(key) ?? 0;
          const active = selected === key;
          return (
            <button key={key} onClick={() => setSelected(active ? null : key)} className="relative flex flex-col items-center gap-1.5 rounded-xl py-2">
              {active && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-xl bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              <span className="relative text-[11.5px] text-muted">{d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
              <span className={cn("relative grid size-8 place-items-center rounded-full text-sm font-medium tabular-nums", active ? "bg-brand text-[#04120b]" : "text-ink-soft")}>
                {d.getUTCDate()}
              </span>
              <span className="relative flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(3, count) }).map((_, i) => (
                  <span key={i} className="size-1.5 rounded-full bg-accent" />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex-1 space-y-2">
        {isLoading && <Skeleton className="h-20" />}
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((o) => (
            <motion.div key={o.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.3 }}>
              <Link to={`/opportunities/${o.slug}`} className="flex items-center gap-3 rounded-2xl bg-well p-3 transition-colors hover:bg-surface-2">
                <PublisherMark size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.title}</p>
                  <p className="truncate text-xs text-muted">{DIGIBIZZ.name}</p>
                </div>
                <DeadlinePill deadline={o.deadline} />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
        {!isLoading && !list.length && <p className="py-6 text-center text-sm text-muted">No deadlines {selected ? "on this day" : "this week"}.</p>}
      </div>
      <ButtonLink to="/jobs?closingSoon=1" variant="secondary" block className="mt-4">
        View all closing soon
      </ButtonLink>
    </div>
  );
}

function FieldBreakdown() {
  const { data } = useFacetsQuery(undefined);
  const fields = (data?.fields ?? []).slice(0, 5);
  const total = fields.reduce((a, f) => a + f.count, 0);
  const colors = ["var(--brand)", "var(--teal)", "var(--violet)", "var(--accent)", "var(--info)"];
  return (
    <div className="panel p-5">
      <PanelHeader title="What DigiBizz is offering" subtitle="Open opportunities by field" />
      <div className="mt-5 space-y-4">
        {fields.map((f, i) => (
          <Link key={f.value} to={`/jobs?field=${encodeURIComponent(f.value)}`} className="group block">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium transition-colors group-hover:text-brand">{f.value}</span>
              <span className="tabular-nums text-muted">
                <CountUp value={f.count} /> · {total ? Math.round((f.count / total) * 100) : 0}%
              </span>
            </div>
            <Meter value={f.count} max={total} color={colors[i % colors.length]!} />
          </Link>
        ))}
        {!fields.length && <p className="py-4 text-center text-sm text-muted">New opportunities are published regularly.</p>}
      </div>
      <p className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wider text-muted">Cities</p>
      <div className="flex flex-wrap gap-1.5">
        {(data?.cities ?? []).slice(0, 8).map((c, i) => (
          <motion.span key={c.value} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
            <Link to={`/jobs?city=${encodeURIComponent(c.value)}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-well px-2.5 py-1 text-[12.5px] transition-colors hover:border-brand hover:text-brand">
              <MapPin className="size-3" /> {c.value} <span className="text-muted">{c.count}</span>
            </Link>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-4 border-t border-line px-4 py-8 text-sm text-muted sm:px-6">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p>© {new Date().getFullYear()} {DIGIBIZZ.name}. Official opportunities portal.</p>
        <div className="flex flex-wrap justify-center gap-4">
          {OPPORTUNITY_TYPES.map((t) => (
            <Link key={t} to={`/${OPPORTUNITY_TYPE_META[t].path}`} className="hover:text-ink">
              {OPPORTUNITY_TYPE_META[t].plural}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  useShellHeader({ title: "Home", subtitle: `${DIGIBIZZ.name} · jobs, internships, programs & courses, trainings` });
  return (
    <div className="space-y-12 pb-4">
      <Hero />
      <TypeKpis />
      <Featured />
      <section className="grid gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <div className="mb-3 flex items-center gap-2">
            <Lightning weight="fill" className="size-5 text-accent" />
            <h2 className="text-xl font-semibold">Closing soon</h2>
          </div>
          <ClosingSoon />
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkle weight="fill" className="size-5 text-brand" />
            <h2 className="text-xl font-semibold">Explore by field</h2>
          </div>
          <FieldBreakdown />
        </Reveal>
      </section>
      <Footer />
    </div>
  );
}
