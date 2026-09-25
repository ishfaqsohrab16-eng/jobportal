import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { fadeUp } from "@/lib/motion";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className ?? "size-5")} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

type Tone = "neutral" | "brand" | "accent" | "violet" | "teal" | "danger" | "warn" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-soft border-line",
  brand: "bg-brand-soft text-brand border-[color-mix(in_oklab,var(--brand)_25%,transparent)]",
  accent: "bg-accent-soft text-accent border-[color-mix(in_oklab,var(--accent)_25%,transparent)]",
  violet: "bg-violet-soft text-violet border-[color-mix(in_oklab,var(--violet)_25%,transparent)]",
  teal: "bg-teal-soft text-teal border-[color-mix(in_oklab,var(--teal)_25%,transparent)]",
  danger: "bg-danger-soft text-danger border-[color-mix(in_oklab,var(--danger)_25%,transparent)]",
  warn: "bg-warn-soft text-warn border-[color-mix(in_oklab,var(--warn)_25%,transparent)]",
  info: "bg-info-soft text-info border-[color-mix(in_oklab,var(--info)_25%,transparent)]",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Small green/red change pill used next to KPI numbers. */
export function DeltaPill({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold",
        up ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger",
      )}
    >
      {up ? <ArrowUpRight weight="bold" className="size-3" /> : <ArrowDownRight weight="bold" className="size-3" />}
      {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center gap-0.5 rounded-md border border-line bg-surface-2 px-1.5 font-mono text-[10.5px] text-muted">
      {children}
    </kbd>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  // Stable hue per name so avatars feel personal without images.
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return src ? (
    <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-xl bg-surface-2 object-contain", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-xl font-display font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center", className)}
    >
      {icon && (
        <motion.div
          className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}

export function PanelHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
