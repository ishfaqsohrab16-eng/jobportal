import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { motion } from "motion/react";
import {
  ArrowSquareOut,
  ArrowUpRight,
  Briefcase,
  CalendarBlank,
  CheckCircle,
  Clock,
  CurrencyCircleDollar,
  GenderIntersex,
  Gift,
  GraduationCap,
  HourglassMedium,
  Link as LinkIcon,
  MapPin,
  Medal,
  ShareNetwork,
  Timer,
  UserFocus,
  UsersThree,
} from "@phosphor-icons/react";
import {
  APPLICATION_STATUS_LABEL,
  CATEGORY_LABEL,
  daysLeft,
  deadlineLabel,
  EMPLOYMENT_TYPE_LABEL,
  formatAge,
  formatDate,
  formatExperience,
  formatGender,
  formatLocation,
  formatSalary,
  OPPORTUNITY_TYPE_META,
  type OpportunityDTO,
} from "@digibizz/jobs-shared";
import { useOpportunityQuery, useSimilarQuery } from "@/store/api";
import { useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Reveal, Stagger } from "@/components/motion";
import { CategoryBadge, DeadlinePill, Fact, OpportunityCard, SaveButton, TYPE_TINT, TypeBadge } from "@/components/opportunity";
import { Avatar, Badge, Button, ButtonLink, EmptyState, Skeleton } from "@/components/ui";
import { errorStatus } from "@/lib/errors";
import { ease, fadeUp } from "@/lib/motion";


/** Ring that empties as the deadline approaches (30-day scale). */
function DeadlineRing({ deadline }: { deadline: string | null }) {
  const d = daysLeft(deadline);
  const pct = d == null ? 1 : Math.max(0, Math.min(1, d / 30));
  const color = d == null ? "var(--brand)" : d <= 3 ? "var(--danger)" : d <= 10 ? "var(--warn)" : "var(--brand)";
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-[72px] place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease, delay: 0.3 }}
        />
      </svg>
      <div className="text-center leading-none">
        <p className="font-display text-lg font-bold tabular-nums">{d == null ? "∞" : Math.max(0, d)}</p>
        <p className="text-[9.5px] uppercase tracking-wider text-muted">days</p>
      </div>
    </div>
  );
}

function ApplyCta({ o, block }: { o: OpportunityDTO; block?: boolean }) {
  const { search } = useLocation();
  if (o.viewer?.applicationStatus) {
    return (
      <ButtonLink to="/me" variant="secondary" size="lg" block={block} icon={<CheckCircle weight="fill" className="size-5 text-brand" />}>
        Applied · {APPLICATION_STATUS_LABEL[o.viewer.applicationStatus]}
      </ButtonLink>
    );
  }
  if (o.publicStatus !== "open") {
    return (
      <Button size="lg" disabled block={block}>
        {o.publicStatus === "expired" ? "Deadline passed" : "Applications closed"}
      </Button>
    );
  }
  if (o.externalApplyUrl) {
    return (
      <motion.a whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} href={o.externalApplyUrl} target="_blank" rel="noopener noreferrer" className={block ? "block" : "inline-block"}>
        <Button variant="primary" size="lg" block={block} chip={<ArrowSquareOut className="size-4" />} tabIndex={-1}>
          Apply on {o.organization.name.split(" ")[0]}’s site
        </Button>
      </motion.a>
    );
  }
  return (
    <ButtonLink to={`/opportunities/${o.slug}/apply${search}`} variant="primary" size="lg" block={block} chip={<ArrowUpRight weight="bold" className="size-4" />}>
      Apply now
    </ButtonLink>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal className="panel p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </Reveal>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <Stagger as="ul" className="space-y-2.5" gap={0.05}>
      {items.map((it, i) => (
        <motion.li key={i} variants={fadeUp} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
          <CheckCircle weight="fill" className="mt-1 size-4.5 shrink-0 text-brand" />
          {it}
        </motion.li>
      ))}
    </Stagger>
  );
}

export default function OpportunityDetail() {
  const { slug = "" } = useParams();
  const { data: o, isLoading, error } = useOpportunityQuery(slug);
  const { data: similar } = useSimilarQuery(slug, { skip: !o });
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useShellHeader(
    o
      ? { title: o.title, subtitle: `${o.organization.name} · ${OPPORTUNITY_TYPE_META[o.type].label}` }
      : { title: isLoading ? "Loading…" : "Opportunity" },
    [o?.id],
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-52" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }
  if (!o) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Briefcase className="size-7" />}
          title={errorStatus(error) === 404 ? "This opportunity doesn't exist" : "Couldn't load this opportunity"}
          body="It may have been removed. Browse what's open right now instead."
          action={<ButtonLink to="/jobs" variant="primary">Browse jobs</ButtonLink>}
        />
      </div>
    );
  }

  const isLearning = o.type === "program" || o.type === "training";
  const tint = TYPE_TINT[o.type].var;
  const share = async () => {
    const url = `${location.origin}/opportunities/${o.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: o.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied");
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const facts = [
    { icon: <MapPin className="size-4.5" />, label: "Location", value: formatLocation(o) },
    { icon: <UsersThree className="size-4.5" />, label: isLearning ? "Seats" : "Positions", value: o.positions },
    isLearning
      ? { icon: <CurrencyCircleDollar className="size-4.5" />, label: "Fee", value: o.fee === 0 ? "Free" : o.fee != null ? `${o.salaryCurrency} ${o.fee.toLocaleString()}` : "Contact organization" }
      : { icon: <CurrencyCircleDollar className="size-4.5" />, label: o.type === "internship" ? "Stipend" : "Salary", value: formatSalary(o) },
    o.employmentType && { icon: <Briefcase className="size-4.5" />, label: "Employment", value: EMPLOYMENT_TYPE_LABEL[o.employmentType] },
    (o.duration || o.contractDuration) && { icon: <HourglassMedium className="size-4.5" />, label: o.contractDuration ? "Contract" : "Duration", value: o.contractDuration || o.duration },
    o.type === "job" && { icon: <Timer className="size-4.5" />, label: "Experience", value: formatExperience(o.experienceMinYears, o.experienceMaxYears) },
    (o.education || o.qualification) && { icon: <GraduationCap className="size-4.5" />, label: "Education", value: [o.education, o.qualification].filter(Boolean).join(" · ") },
    { icon: <UserFocus className="size-4.5" />, label: "Age limit", value: formatAge(o.ageMin, o.ageMax) },
    { icon: <GenderIntersex className="size-4.5" />, label: "Gender", value: formatGender(o.gender) },
    o.startDate && { icon: <CalendarBlank className="size-4.5" />, label: "Starts", value: formatDate(o.startDate) },
    { icon: <Clock className="size-4.5" />, label: "Apply by", value: o.deadline ? formatDate(o.deadline) : "Rolling" },
    o.certification && { icon: <Medal className="size-4.5" />, label: "Certification", value: o.certification },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: React.ReactNode }[];

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* Hero panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="panel glow-corner relative overflow-hidden p-6 sm:p-8"
        style={{ ["--tint" as string]: tint, background: `linear-gradient(150deg, color-mix(in oklab, ${tint} 10%, var(--surface)), var(--surface) 55%)` }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <motion.div initial={{ scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}>
            <Avatar name={o.organization.name} src={o.organization.logoUrl} size={72} className="rounded-2xl" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <TypeBadge type={o.type} />
              <CategoryBadge category={o.category} />
              {o.isITRelated && <Badge tone="info">IT & Tech</Badge>}
              {o.field && <Badge>{o.field}</Badge>}
              {o.publicStatus !== "open" && <Badge tone="danger">{o.publicStatus === "expired" ? "Expired" : "Closed"}</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{o.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted">
              {o.organization.slug ? (
                <Link to={`/organizations/${o.organization.slug}`} className="font-medium text-ink-soft hover:text-brand">
                  {o.organization.name}
                </Link>
              ) : (
                o.organization.name
              )}
              <span className="flex items-center gap-1">
                <MapPin className="size-4" /> {formatLocation(o)}
              </span>
              {o.publishedAt && <span>Posted {formatDate(o.publishedAt)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DeadlineRing deadline={o.deadline} />
            <div className="hidden flex-col gap-2 sm:flex">
              <ApplyCta o={o} />
              <div className="flex gap-2">
                <SaveButton opportunity={o} size="lg" />
                <Button size="lg" className="flex-1" icon={copied ? <LinkIcon className="size-4" /> : <ShareNetwork className="size-4" />} onClick={share}>
                  {copied ? "Copied" : "Share"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          {o.summary && (
            <Reveal className="rounded-2xl border border-brand/25 bg-brand-soft/50 p-5 text-[15px] font-medium text-brand-ink">{o.summary}</Reveal>
          )}
          <Section title={isLearning ? "About the program" : "About the role"}>
            <p className="prose-plain text-[15px]">{o.description}</p>
          </Section>
          {o.responsibilities.length > 0 && (
            <Section title="What you'll do">
              <Bullets items={o.responsibilities} />
            </Section>
          )}
          {(o.requirements.length > 0 || o.eligibility) && (
            <Section title={isLearning || o.type === "internship" ? "Eligibility & requirements" : "Requirements"}>
              {o.eligibility && <p className="prose-plain mb-4 text-[15px]">{o.eligibility}</p>}
              <Bullets items={o.requirements} />
            </Section>
          )}
          {o.skills.length > 0 && (
            <Section title="Skills">
              <Stagger className="flex flex-wrap gap-2" gap={0.03}>
                {o.skills.map((s) => (
                  <motion.span key={s} variants={fadeUp} className="rounded-xl border border-line bg-well px-3 py-1.5 text-sm font-medium">
                    {s}
                  </motion.span>
                ))}
              </Stagger>
            </Section>
          )}
          {o.benefits.length > 0 && (
            <Section title={isLearning ? "What you get" : "Benefits"}>
              <Stagger className="grid gap-3 sm:grid-cols-2" gap={0.05}>
                {o.benefits.map((b) => (
                  <motion.div key={b} variants={fadeUp} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-line bg-well/60 p-4">
                    <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                      <Gift className="size-4.5" />
                    </span>
                    <span className="text-sm font-medium">{b}</span>
                  </motion.div>
                ))}
              </Stagger>
            </Section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="panel p-5 lg:sticky lg:top-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">At a glance</h2>
              <DeadlinePill deadline={o.deadline} />
            </div>
            <div className="grid gap-2">
              {facts.map((f, i) => (
                <Fact key={f.label} {...f} index={i} />
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              {CATEGORY_LABEL[o.category]} · {deadlineLabel(o.deadline)}
            </p>
          </div>
        </aside>
      </div>

      {similar && similar.length > 0 && (
        <section className="mt-10">
          <Reveal>
            <h2 className="mb-4 text-xl font-semibold">Similar {OPPORTUNITY_TYPE_META[o.type].plural.toLowerCase()}</h2>
          </Reveal>
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {similar.map((s, i) => (
              <OpportunityCard key={s.id} o={s} index={i} />
            ))}
          </Stagger>
        </section>
      )}

      {/* Mobile sticky apply bar */}
      <motion.div
        initial={{ y: 120 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 28 }}
        className="fixed inset-x-3 bottom-[84px] z-30 flex gap-2 rounded-2xl border border-line-strong bg-surface/90 p-2 shadow-2xl backdrop-blur-xl sm:hidden"
      >
        <SaveButton opportunity={o} size="lg" />
        <div className="flex-1">
          <ApplyCta o={o} block />
        </div>
      </motion.div>
    </div>
  );
}
