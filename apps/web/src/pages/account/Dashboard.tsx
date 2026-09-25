import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bookmarks, CaretDown, CheckCircle, Circle, MagnifyingGlass, PaperPlaneTilt, Sparkle, Trophy, Tray, XCircle } from "@phosphor-icons/react";
import {
  APPLICATION_STATUS_LABEL,
  formatDate,
  OPPORTUNITY_TYPE_META,
  type ApplicationDTO,
  type ApplicationStatus,
} from "@digibizz/jobs-shared";
import { useMyApplicationsQuery, useOpportunitiesQuery, useSavedQuery, useWithdrawMutation } from "@/store/api";
import { useAuth, useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { CountUp, MiniBars, Stagger } from "@/components/motion";
import { OpportunityCard, PublisherMark, TypeBadge } from "@/components/opportunity";
import { Badge, Button, ButtonLink, ConfirmDialog, EmptyState, Input, PanelHeader, Segmented, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { ease, panelIntro } from "@/lib/motion";

export const STATUS_TONE: Record<ApplicationStatus, "neutral" | "brand" | "accent" | "violet" | "teal" | "danger" | "warn" | "info"> = {
  submitted: "info",
  reviewing: "warn",
  shortlisted: "teal",
  interview: "violet",
  offered: "accent",
  hired: "brand",
  rejected: "danger",
  withdrawn: "neutral",
};

const PIPELINE: ApplicationStatus[] = ["submitted", "reviewing", "shortlisted", "interview", "offered", "hired"];

function Pipeline({ app }: { app: ApplicationDTO }) {
  const idx = PIPELINE.indexOf(app.status);
  const ended = app.status === "rejected" || app.status === "withdrawn";
  const reached = ended ? Math.max(0, ...app.history.map((h) => PIPELINE.indexOf(h.status))) : idx;
  return (
    <div className="flex items-center gap-1">
      {PIPELINE.map((s, i) => (
        <motion.span
          key={s}
          title={APPLICATION_STATUS_LABEL[s]}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.05 * i, duration: 0.3 }}
          className={cn("h-1.5 w-6 origin-left rounded-full", i <= reached ? (ended ? "bg-muted/60" : "bg-brand") : "bg-line")}
        />
      ))}
    </div>
  );
}

function Timeline({ app }: { app: ApplicationDTO }) {
  return (
    <ol className="relative ml-2 space-y-4 border-l border-line pl-5">
      {app.history.map((h, i) => (
        <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="relative">
          <span className="absolute -left-[27px] top-0.5 grid size-3.5 place-items-center rounded-full border-2 border-paper bg-brand" />
          <p className="text-sm font-medium">{APPLICATION_STATUS_LABEL[h.status]}</p>
          <p className="text-xs text-muted">{new Date(h.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
          {h.note && <p className="mt-1 text-sm text-ink-soft">{h.note}</p>}
        </motion.li>
      ))}
    </ol>
  );
}

function ProfileStrength() {
  const { user } = useAuth();
  if (!user) return null;
  const checks = [
    { ok: !!user.resume, label: "Upload a resume" },
    { ok: !!user.phone, label: "Add a phone number" },
    { ok: !!user.headline, label: "Write a headline" },
    { ok: user.skills.length >= 3, label: "List 3+ skills" },
    { ok: !!user.education, label: "Add your education" },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="panel flex h-full flex-col p-5">
      <PanelHeader title="Profile strength" subtitle="Complete profiles get shortlisted more often" />
      <div className="mt-4 flex items-center gap-5">
        <div className="relative grid size-24 shrink-0 place-items-center">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
            <motion.circle cx="40" cy="40" r={r} fill="none" stroke="var(--brand)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.3, ease, delay: 0.3 }} />
          </svg>
          <p className="font-display text-2xl font-bold">
            <CountUp value={pct} />%
          </p>
        </div>
        <ul className="space-y-1.5 text-sm">
          {checks.map((ch, i) => (
            <motion.li key={ch.label} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }} className={cn("flex items-center gap-2", ch.ok ? "text-muted line-through" : "text-ink-soft")}>
              {ch.ok ? <CheckCircle weight="fill" className="size-4 text-brand" /> : <Circle className="size-4 text-muted" />}
              {ch.label}
            </motion.li>
          ))}
        </ul>
      </div>
      {pct < 100 && (
        <ButtonLink to="/me/profile" variant="secondary" block className="mt-auto" chip={<ArrowRight className="size-3.5" />}>
          Complete profile
        </ButtonLink>
      )}
    </div>
  );
}

function Recommended() {
  const { user } = useAuth();
  const q = user?.skills[0] ?? "";
  const { data } = useOpportunitiesQuery({ q, limit: 3, it: q ? undefined : "1" });
  if (!data?.items.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Sparkle weight="fill" className="size-5 text-accent" />
        <h2 className="text-lg font-semibold">{q ? `Because you know ${q}` : "Recommended for you"}</h2>
      </div>
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.items.map((o, i) => (
          <OpportunityCard key={o.id} o={o} index={i} />
        ))}
      </Stagger>
    </section>
  );
}

type Filter = "all" | "active" | "closed";

export default function Dashboard() {
  const { user } = useAuth();
  useShellHeader({ title: `Hi, ${user?.name.split(" ")[0] ?? "there"}`, subtitle: "Your applications and next steps" });
  const { data: apps, isLoading } = useMyApplicationsQuery();
  const { data: saved } = useSavedQuery();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawMutation();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ApplicationDTO | null>(null);

  const list = apps ?? [];
  const inProgress = list.filter((a) => ["reviewing", "shortlisted", "interview"].includes(a.status)).length;
  const offers = list.filter((a) => ["offered", "hired"].includes(a.status)).length;
  const rows = useMemo(
    () =>
      list.filter((a) => {
        const closed = ["rejected", "withdrawn", "hired"].includes(a.status);
        if (filter === "active" && closed) return false;
        if (filter === "closed" && !closed) return false;
        return !q || `${a.opportunity.title} ${a.opportunity.organizationName}`.toLowerCase().includes(q.toLowerCase());
      }),
    [list, filter, q],
  );

  const kpis = [
    { label: "Applications", value: list.length, icon: <PaperPlaneTilt className="size-4" />, tint: "var(--brand)", bars: [2, 4, 3, 6, 5, 7, 6] },
    { label: "In progress", value: inProgress, icon: <Tray className="size-4" />, tint: "var(--violet)", bars: [3, 2, 5, 4, 6, 3, 5] },
    { label: "Offers", value: offers, icon: <Trophy className="size-4" />, tint: "var(--accent)", bars: [1, 2, 1, 3, 2, 4, 3] },
    { label: "Saved", value: saved?.length ?? 0, icon: <Bookmarks className="size-4" />, tint: "var(--teal)", bars: [4, 3, 5, 6, 4, 7, 5] },
  ];

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            custom={i}
            variants={panelIntro}
            initial="hidden"
            animate="show"
            className="panel glow-corner flex items-end justify-between p-5"
            style={{ ["--tint" as string]: k.tint, background: `linear-gradient(160deg, color-mix(in oklab, ${k.tint} 13%, var(--surface)), var(--surface) 65%)` }}
          >
            <div className="relative">
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <span style={{ color: k.tint }}>{k.icon}</span>
                {k.label}
              </p>
              <div className="mt-5 font-display text-[34px] font-semibold leading-none">{isLoading ? <Skeleton className="h-8 w-12" /> : <CountUp value={k.value} />}</div>
            </div>
            <MiniBars values={k.bars} tint={k.tint} height={64} className="relative w-24" />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <motion.section custom={4} variants={panelIntro} initial="hidden" animate="show" className="panel min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 basis-52">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications" leading={<MagnifyingGlass className="size-4" />} className="h-10" />
            </div>
            <Segmented
              value={filter}
              onChange={setFilter}
              size="sm"
              options={[
                { value: "all", label: "All", count: list.length },
                { value: "active", label: "Active" },
                { value: "closed", label: "Closed" },
              ]}
            />
          </div>

          <div className="hidden grid-cols-[2fr_1fr_1fr_1.1fr_40px] gap-4 rounded-xl bg-well px-4 py-3 text-xs font-medium text-muted md:grid">
            <span>Opportunity</span>
            <span>Applied</span>
            <span>Status</span>
            <span>Progress</span>
            <span />
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : rows.length ? (
            <ul className="mt-1 divide-y divide-line">
              <AnimatePresence initial={false}>
                {rows.map((a, i) => (
                  <motion.li key={a.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.04, duration: 0.35 }}>
                    <button onClick={() => setOpen(open === a.id ? null : a.id)} className="grid w-full grid-cols-1 items-center gap-3 px-2 py-4 text-left md:grid-cols-[2fr_1fr_1fr_1.1fr_40px] md:gap-4 md:px-4">
                      <span className="flex min-w-0 items-center gap-3">
                        <PublisherMark size={38} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{a.opportunity.title}</span>
                          <span className="flex items-center gap-2 truncate text-xs text-muted">
                            {a.opportunity.organizationName} · {OPPORTUNITY_TYPE_META[a.opportunity.type].label}
                          </span>
                        </span>
                      </span>
                      <span className="text-sm text-ink-soft">{formatDate(a.createdAt)}</span>
                      <span>
                        <Badge tone={STATUS_TONE[a.status]} dot>
                          {APPLICATION_STATUS_LABEL[a.status]}
                        </Badge>
                      </span>
                      <Pipeline app={a} />
                      <motion.span animate={{ rotate: open === a.id ? 180 : 0 }} className="hidden justify-self-end text-muted md:block">
                        <CaretDown className="size-4" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open === a.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
                          <div className="mb-4 grid gap-5 rounded-2xl bg-well/60 p-5 md:grid-cols-[1fr_auto]">
                            <Timeline app={a} />
                            <div className="flex flex-wrap items-start gap-2 md:flex-col md:items-end">
                              <TypeBadge type={a.opportunity.type} />
                              {a.opportunity.slug && (
                                <ButtonLink to={`/opportunities/${a.opportunity.slug}`} size="sm">
                                  View posting
                                </ButtonLink>
                              )}
                              {!["hired", "rejected", "withdrawn"].includes(a.status) && (
                                <Button size="sm" variant="ghost" className="text-danger" icon={<XCircle className="size-4" />} onClick={() => setConfirm(a)}>
                                  Withdraw
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <EmptyState
              className="mt-4"
              icon={<PaperPlaneTilt className="size-7" />}
              title={list.length ? "No applications match" : "No applications yet"}
              body={list.length ? "Try a different filter." : "Find something you love and apply in a couple of clicks."}
              action={!list.length && <ButtonLink to="/jobs" variant="primary">Browse jobs</ButtonLink>}
            />
          )}
        </motion.section>

        <motion.div custom={5} variants={panelIntro} initial="hidden" animate="show" className="space-y-4">
          <ProfileStrength />
          <div className="panel p-5">
            <PanelHeader title="Saved" subtitle={`${saved?.length ?? 0} opportunities`} actions={<Link to="/me/saved" className="text-sm font-medium text-brand hover:underline">View all</Link>} />
            <div className="mt-3 space-y-2">
              {(saved ?? []).slice(0, 3).map((o) => (
                <Link key={o.id} to={`/opportunities/${o.slug}`} className="flex items-center gap-3 rounded-xl bg-well p-2.5 transition-colors hover:bg-surface-2">
                  <PublisherMark size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.title}</span>
                </Link>
              ))}
              {!saved?.length && <p className="py-3 text-center text-sm text-muted">Nothing saved yet.</p>}
            </div>
          </div>
        </motion.div>
      </div>

      <Recommended />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Withdraw application?"
        body={confirm ? `Your application for “${confirm.opportunity.title}” will be withdrawn. You can't re-apply to the same posting.` : undefined}
        confirmLabel="Withdraw"
        danger
        loading={withdrawing}
        onConfirm={async () => {
          if (!confirm) return;
          try {
            await withdraw(confirm.id).unwrap();
            toast.info("Application withdrawn");
          } catch (err) {
            toast.error("Couldn't withdraw", errorMessage(err));
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
