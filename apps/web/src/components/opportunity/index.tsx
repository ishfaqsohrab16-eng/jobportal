import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  BookmarkSimple,
  Briefcase,
  Chalkboard,
  Clock,
  GraduationCap,
  MapPin,
  SealCheck,
  Student,
  UsersThree,
} from "@phosphor-icons/react";
import {
  daysLeft,
  DIGIBIZZ,
  deadlineLabel,
  EMPLOYMENT_TYPE_LABEL,
  formatLocation,
  formatSalary,
  OPPORTUNITY_TYPE_META,
  type OpportunityDTO,
  type OpportunityType,
} from "@digibizz/jobs-shared";
import { useAuth, usePointerGlow, useToast } from "@/hooks";
import { useToggleSaveMutation } from "@/store/api";
import { cn } from "@/lib/cn";
import { fadeUp } from "@/lib/motion";
import { Badge, Skeleton } from "@/components/ui";
import { LogoMark } from "@/components/brand/Logo";

export const TYPE_TINT: Record<OpportunityType, { var: string; tone: "brand" | "teal" | "violet" | "accent" }> = {
  job: { var: "var(--brand)", tone: "brand" },
  internship: { var: "var(--teal)", tone: "teal" },
  program: { var: "var(--violet)", tone: "violet" },
  training: { var: "var(--accent)", tone: "accent" },
};

export const TYPE_ICON: Record<OpportunityType, (cls?: string) => ReactNode> = {
  job: (c = "size-5") => <Briefcase className={c} />,
  internship: (c = "size-5") => <Student className={c} />,
  program: (c = "size-5") => <GraduationCap className={c} />,
  training: (c = "size-5") => <Chalkboard className={c} />,
};

export function TypeBadge({ type }: { type: OpportunityType }) {
  return <Badge tone={TYPE_TINT[type].tone}>{OPPORTUNITY_TYPE_META[type].label}</Badge>;
}

/** Every opportunity is published by DigiBizz Balochistan; this is its mark. */
export function PublisherMark({ size = 40, className }: { size?: number; className?: string }) {
  return <LogoMark size={size} animate={false} className={className} />;
}

export function OfficialBadge() {
  return (
    <Badge tone="brand">
      <SealCheck weight="fill" className="size-3.5" />
      Official {DIGIBIZZ.name.split(" ")[0]}
    </Badge>
  );
}

export function DeadlinePill({ deadline, className }: { deadline: string | null; className?: string }) {
  const d = daysLeft(deadline);
  const urgent = d != null && d >= 0 && d <= 3;
  const soon = d != null && d > 3 && d <= 10;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        d != null && d < 0 ? "bg-surface-2 text-muted" : urgent ? "bg-danger-soft text-danger" : soon ? "bg-warn-soft text-warn" : "bg-well text-ink-soft",
        className,
      )}
    >
      {urgent ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-danger" />
        </span>
      ) : (
        <Clock className="size-3.5" />
      )}
      {deadlineLabel(deadline)}
    </span>
  );
}

/** Bookmark with a little burst of particles when saved. */
export function SaveButton({ opportunity, size = "md" }: { opportunity: OpportunityDTO; size?: "md" | "lg" }) {
  const { user } = useAuth();
  const [toggle] = useToggleSaveMutation();
  const [local, setLocal] = useState<boolean | null>(null);
  const saved = local ?? opportunity.viewer?.saved ?? false;
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const next = !saved;
    setLocal(next);
    try {
      await toggle({ id: opportunity.id, save: next }).unwrap();
      if (next) toast.success("Saved", "Find it later under Saved.");
    } catch {
      setLocal(!next);
      toast.error("Couldn't update saved items");
    }
  };

  const dim = size === "lg" ? "size-11" : "size-9";
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={cn("relative grid shrink-0 place-items-center rounded-xl border transition-colors", dim, saved ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface-2 text-muted hover:text-ink")}
    >
      <motion.span key={String(saved)} initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
        <BookmarkSimple weight={saved ? "fill" : "regular"} className="size-4.5" />
      </motion.span>
      <AnimatePresence>
        {saved &&
          Array.from({ length: 6 }).map((_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute size-1 rounded-full bg-accent"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 18, y: Math.sin((i / 6) * Math.PI * 2) * 18, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>
    </motion.button>
  );
}

function salaryOrFee(o: OpportunityDTO): string | null {
  if (o.type === "program" || o.type === "training") {
    if (o.fee === 0) return "Free";
    if (o.fee != null) return `${o.salaryCurrency} ${o.fee.toLocaleString("en-US")}`;
    return null;
  }
  const s = formatSalary(o, { compact: true });
  return s === "Not disclosed" ? null : s.replace(" per month", "/mo").replace(" per year", "/yr");
}

export function OpportunityCard({ o, index = 0 }: { o: OpportunityDTO; index?: number }) {
  const glow = usePointerGlow<HTMLAnchorElement>();
  const money = salaryOrFee(o);
  const tint = TYPE_TINT[o.type].var;
  return (
    <motion.div variants={fadeUp} custom={index} layout>
      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className="h-full">
        <Link
          ref={glow}
          to={`/opportunities/${o.slug}`}
          className="panel spotlight glow-corner group flex h-full flex-col gap-4 p-5 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.6)]"
          style={{ ["--tint" as string]: tint }}
        >
          <div className="flex items-start gap-3">
            <PublisherMark size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[13px] text-muted">
                {DIGIBIZZ.name}
                <SealCheck weight="fill" aria-label="Official" className="size-3.5 shrink-0 text-brand" />
              </p>
              <h3 className="mt-0.5 line-clamp-2 text-[16.5px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-brand">{o.title}</h3>
            </div>
            <SaveButton opportunity={o} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <TypeBadge type={o.type} />
            {o.employmentType && <Badge>{EMPLOYMENT_TYPE_LABEL[o.employmentType]}</Badge>}
            {o.featured && (
              <Badge tone="accent" dot>
                Featured
              </Badge>
            )}
          </div>

          <div className="mt-auto grid gap-2 text-[13px] text-ink-soft">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-muted" />
              {formatLocation(o)}
            </span>
            <span className="flex items-center gap-2">
              <UsersThree className="size-4 text-muted" />
              {o.positions} {o.type === "job" ? (o.positions === 1 ? "position" : "positions") : "seats"}
              {o.duration && <span className="text-muted">· {o.duration}</span>}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-dashed border-line pt-4">
            <span className={cn("font-display text-[15px] font-semibold tracking-tight", money ? "text-ink" : "text-muted")}>{money ?? "—"}</span>
            <DeadlinePill deadline={o.deadline} />
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function OpportunityCardSkeleton() {
  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex gap-3">
        <Skeleton className="size-11" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="mt-2 h-8" />
    </div>
  );
}

export function Fact({ icon, label, value, index = 0 }: { icon: ReactNode; label: string; value: ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04, duration: 0.45 }}
      className="flex items-start gap-3 rounded-2xl border border-line bg-well/60 p-3.5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
      </div>
    </motion.div>
  );
}
