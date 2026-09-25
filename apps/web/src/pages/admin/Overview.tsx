import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Broadcast, Kanban, Plus, Tray, UsersThree, WifiHigh } from "@phosphor-icons/react";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  formatDate,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_META,
} from "@digibizz/jobs-shared";
import { useApiKeysQuery, useOverviewQuery } from "@/store/api";
import { useShellHeader } from "@/components/layout/ShellContext";
import { CountUp, FlowChart, Meter, MiniBars } from "@/components/motion";
import { TYPE_TINT } from "@/components/opportunity";
import { Avatar, Badge, ButtonLink, DeltaPill, PanelHeader, Segmented, Skeleton } from "@/components/ui";
import { STATUS_TONE } from "@/pages/account/Dashboard";
import { cn } from "@/lib/cn";
import { panelIntro } from "@/lib/motion";

function Kpi({ i, label, value, tint, bars, delta, icon, to }: { i: number; label: string; value: number; tint: string; bars: number[]; delta?: number; icon: React.ReactNode; to: string }) {
  return (
    <motion.div custom={i} variants={panelIntro} initial="hidden" animate="show">
      <Link
        to={to}
        className="panel glow-corner group flex h-full items-end justify-between gap-3 p-5 transition-colors hover:border-line-strong"
        style={{ ["--tint" as string]: tint, background: `linear-gradient(160deg, color-mix(in oklab, ${tint} 14%, var(--surface)), var(--surface) 62%)` }}
      >
        <div className="relative">
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <span style={{ color: tint }}>{icon}</span>
            {label}
          </p>
          <p className="mt-7 font-display text-[34px] font-semibold leading-none">
            <CountUp value={value} />
          </p>
          {delta != null && (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-muted">
              <DeltaPill value={delta} /> vs last week
            </p>
          )}
        </div>
        <MiniBars values={bars.length ? bars : [0]} tint={tint} height={84} className="relative w-28" />
      </Link>
    </motion.div>
  );
}

/** Partner API "card", after the credit-card widget in the design. */
function PartnerCard() {
  const { data: keys } = useApiKeysQuery();
  const [tab, setTab] = useState<"active" | "all">("active");
  const list = (keys ?? []).filter((k) => tab === "all" || !k.revokedAt);
  const k = list[0];
  return (
    <motion.div custom={3} variants={panelIntro} initial="hidden" animate="show" className="panel flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <Segmented value={tab} onChange={setTab} size="sm" options={[{ value: "active", label: "Active" }, { value: "all", label: "All keys" }]} />
        <ButtonLink to="/admin/api-keys" size="sm" icon={<Plus className="size-3.5" />}>
          Add key
        </ButtonLink>
      </div>
      <motion.div
        key={k?.id ?? "none"}
        initial={{ rotateY: -30, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1c1f22,#0b0c0e)] p-5 text-white [perspective:600px]"
      >
        <span aria-hidden className="absolute -bottom-10 -right-10 size-36 rounded-full bg-[radial-gradient(circle,rgba(47,208,138,0.55),transparent_70%)]" />
        <span aria-hidden className="absolute bottom-0 right-0 h-16 w-28 rounded-tl-[60px] bg-gradient-to-br from-[#1fb4c4] to-[#2fd08a] opacity-80" />
        <div className="flex items-start justify-between">
          <WifiHigh className="size-5 rotate-90 text-white/70" />
          <span className="font-mono text-sm tracking-widest">{k ? `${k.prefix}••••` : "•••• ••••"}</span>
        </div>
        <div className="relative">
          <Broadcast className="mb-2 size-6 text-white/80" />
          <p className="text-[10.5px] uppercase tracking-wider text-white/50">Partner</p>
          <p className="font-medium">{k ? k.name : "No active keys"}</p>
        </div>
      </motion.div>
      {k && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-well p-3">
            <p className="font-display text-xl font-semibold">
              <CountUp value={k.requestCount} />
            </p>
            <p className="text-[11px] text-muted">requests</p>
          </div>
          <div className="rounded-xl bg-well p-3">
            <p className="text-sm font-semibold">{k.lastUsedAt ? formatDate(k.lastUsedAt, { day: "numeric", month: "short" }) : "Never"}</p>
            <p className="text-[11px] text-muted">last sync</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Overview() {
  useShellHeader({
    title: "Dashboard",
    subtitle: "Overview",
    actions: (
      <ButtonLink to="/admin/opportunities/new" variant="primary" size="md" chip={<Plus weight="bold" className="size-3.5" />} className="hidden sm:inline-flex">
        New opportunity
      </ButtonLink>
    ),
  });
  const { data, isLoading } = useOverviewQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const daily = data.daily.map((d) => d.applications);
  const prev7 = daily.slice(0, 7).reduce((a, b) => a + b, 0);
  const last7 = daily.slice(7).reduce((a, b) => a + b, 0);
  const delta = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 ? 100 : 0;
  const labels = data.daily.map((d) => new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }));
  const maxStatus = Math.max(1, ...Object.values(data.applications.byStatus).map((n) => n ?? 0));
  const typeBars = OPPORTUNITY_TYPES.map((t) => data.opportunities.byType[t]);

  return (
    <div className="space-y-4 px-4 py-6 sm:px-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_320px]">
        <Kpi i={0} label="Open opportunities" value={data.opportunities.open} tint="var(--brand)" bars={[...typeBars, data.opportunities.closingThisWeek, data.opportunities.draft]} icon={<Kanban className="size-4" />} to="/admin/opportunities" />
        <Kpi i={1} label="Applications · 7 days" value={data.applications.last7Days} tint="var(--violet)" bars={daily.slice(7)} delta={delta} icon={<Tray className="size-4" />} to="/admin/applications" />
        <Kpi i={2} label="Partner API calls · 30d" value={data.partnerRequests30d} tint="var(--accent)" bars={[3, 5, 4, 7, 6, 8, 7]} icon={<Broadcast className="size-4" />} to="/admin/api-keys" />
        <div className="md:col-span-2 xl:col-span-1 xl:row-span-2">
          <PartnerCard />
        </div>

        <motion.section custom={4} variants={panelIntro} initial="hidden" animate="show" className="panel p-5 md:col-span-2 xl:col-span-3">
          <PanelHeader title="Applications analytics" subtitle="Applications received per day over the last two weeks" />
          <div className="mt-5 grid gap-6 lg:grid-cols-[200px_1fr]">
            <div className="flex flex-row flex-wrap gap-6 lg:flex-col">
              <div>
                <p className="font-display text-3xl font-semibold">
                  <CountUp value={data.applications.total} />
                </p>
                <p className="text-[13px] text-muted">Total applications</p>
              </div>
              <div>
                <p className="font-display text-3xl font-semibold">
                  <CountUp value={data.candidates} />
                </p>
                <p className="text-[13px] text-muted">Registered candidates</p>
              </div>
              <div className="space-y-1.5 text-[13px]">
                <p className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-brand" /> Applications
                </p>
                <p className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-teal" /> 7-day average
                </p>
              </div>
            </div>
            <FlowChart
              labels={labels}
              height={220}
              series={[
                { name: "Applications", color: "var(--brand)", values: daily },
                { name: "7-day average", color: "var(--teal)", values: daily.map((_, i) => Math.round((daily.slice(Math.max(0, i - 6), i + 1).reduce((a, b) => a + b, 0) / Math.min(7, i + 1)) * 10) / 10) },
              ]}
            />
          </div>
        </motion.section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
        <motion.section custom={5} variants={panelIntro} initial="hidden" animate="show" className="panel p-5">
          <PanelHeader title="Pipeline" subtitle="Where every application stands" />
          <div className="mt-5 space-y-3.5">
            {APPLICATION_STATUSES.filter((s) => s !== "withdrawn").map((s) => (
              <div key={s}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="text-ink-soft">{APPLICATION_STATUS_LABEL[s]}</span>
                  <span className="tabular-nums text-muted">{data.applications.byStatus[s] ?? 0}</span>
                </div>
                <Meter value={data.applications.byStatus[s] ?? 0} max={maxStatus} color={`var(--${STATUS_TONE[s] === "neutral" ? "muted" : STATUS_TONE[s]})`} />
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section custom={6} variants={panelIntro} initial="hidden" animate="show" className="panel p-5">
          <PanelHeader title="Open by type" subtitle={`${data.opportunities.closingThisWeek} closing this week · ${data.opportunities.draft} drafts`} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {OPPORTUNITY_TYPES.map((t, i) => (
              <motion.div key={t} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.07 }}>
                <Link to={`/admin/opportunities?type=${t}`} className="block rounded-2xl border border-line bg-well/60 p-4 transition-colors hover:border-line-strong">
                  <span className="block size-2 rounded-full" style={{ background: TYPE_TINT[t].var }} />
                  <p className="mt-3 font-display text-2xl font-semibold">
                    <CountUp value={data.opportunities.byType[t]} />
                  </p>
                  <p className="text-[12.5px] text-muted">{OPPORTUNITY_TYPE_META[t].plural}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section custom={7} variants={panelIntro} initial="hidden" animate="show" className="panel flex flex-col p-5">
          <PanelHeader title="Sources" subtitle="Where applicants came from" />
          <div className="mt-4 flex-1 space-y-2">
            {data.applications.bySource.length ? (
              data.applications.bySource.map((s, i) => (
                <motion.div key={s.source} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.06 }} className="flex items-center gap-3 rounded-xl bg-well p-3">
                  <Avatar name={s.source} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.source === "direct" ? "DigiBizz portal" : s.source}</p>
                    <p className="text-xs text-muted">{s.source === "direct" ? "Direct visits" : "Partner referral"}</p>
                  </div>
                  <Badge tone={s.source === "direct" ? "neutral" : "violet"}>{s.count}</Badge>
                </motion.div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted">No applications yet.</p>
            )}
          </div>
          <ButtonLink to="/admin/applications" block className="mt-4">
            View all
          </ButtonLink>
        </motion.section>
      </div>

      <motion.section custom={8} variants={panelIntro} initial="hidden" animate="show" className="panel p-4 sm:p-5">
        <PanelHeader
          title="Recent applications"
          actions={
            <Link to="/admin/applications" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              Open inbox <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        <div className="mt-4 hidden grid-cols-[1.4fr_1.6fr_1fr_1fr_1fr] gap-4 rounded-xl bg-well px-4 py-3 text-xs font-medium text-muted md:grid">
          <span>Candidate</span>
          <span>Opportunity</span>
          <span>Source</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-line">
          {data.recent.map((a, i) => (
            <motion.li key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }} className="grid grid-cols-1 gap-2 px-2 py-3.5 text-sm md:grid-cols-[1.4fr_1.6fr_1fr_1fr_1fr] md:items-center md:gap-4 md:px-4">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={a.candidate?.name ?? "?"} size={32} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.candidate?.name}</span>
                  <span className="block truncate text-xs text-muted">{a.candidate?.email}</span>
                </span>
              </span>
              <span className="truncate text-ink-soft">{a.opportunity.title}</span>
              <span className={cn("truncate", a.source === "direct" ? "text-muted" : "text-violet")}>{a.source}</span>
              <span className="text-muted">{formatDate(a.createdAt)}</span>
              <span>
                <Badge tone={STATUS_TONE[a.status]} dot>
                  {APPLICATION_STATUS_LABEL[a.status]}
                </Badge>
              </span>
            </motion.li>
          ))}
          {!data.recent.length && <li className="py-10 text-center text-sm text-muted"><UsersThree className="mx-auto mb-2 size-6" />Applications will appear here.</li>}
        </ul>
      </motion.section>
    </div>
  );
}
