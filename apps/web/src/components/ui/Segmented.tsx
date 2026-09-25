import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Pill segmented control ("Credit | Debit" in the dashboard design).
 * The active background glides between options via a shared layoutId.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const layoutId = useId();
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex items-center gap-0.5 rounded-xl bg-well p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition-colors",
              size === "sm" ? "h-7 rounded-lg px-2.5 text-[12.5px]" : "h-8 rounded-lg px-3.5 text-[13px]",
              active ? "text-ink" : "text-muted hover:text-ink-soft",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg border border-line-strong/60 bg-surface-2 shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count != null && (
              <span className={cn("relative rounded-md px-1 text-[10.5px] tabular-nums", active ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted")}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
