import { motion } from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

function pages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const list = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const btn = "grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <button className={cn(btn, "text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <CaretLeft className="size-4" />
      </button>
      {pages(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button key={p} onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} className={cn(btn, "relative", p === page ? "text-[#04120b]" : "text-ink-soft hover:bg-surface-2")}>
            {p === page && <motion.span layoutId="page-pill" className="absolute inset-0 rounded-xl bg-brand" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
            <span className="relative tabular-nums">{p}</span>
          </button>
        ),
      )}
      <button className={cn(btn, "text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40")} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <CaretRight className="size-4" />
      </button>
    </nav>
  );
}
