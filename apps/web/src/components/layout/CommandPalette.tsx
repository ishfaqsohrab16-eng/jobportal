import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Briefcase, ArrowElbowDownLeft, MagnifyingGlass } from "@phosphor-icons/react";
import { OPPORTUNITY_TYPE_META, deadlineLabel } from "@digibizz/jobs-shared";
import { useOpportunitiesQuery } from "@/store/api";
import { useDebouncedValue } from "@/hooks";
import { cn } from "@/lib/cn";
import { Kbd, Spinner } from "@/components/ui";

export interface QuickLink {
  label: string;
  to: string;
  icon: React.ReactNode;
  hint?: string;
}

export function CommandPalette({ open, onClose, links }: { open: boolean; onClose: () => void; links: QuickLink[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(q.trim(), 220);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isFetching } = useOpportunitiesQuery({ q: debounced, limit: 6 }, { skip: !open || debounced.length < 2 });

  const items = useMemo(() => {
    const nav = links
      .filter((l) => !q || l.label.toLowerCase().includes(q.toLowerCase()))
      .map((l) => ({ key: `n${l.to}`, label: l.label, sub: l.hint ?? "Go to page", to: l.to, icon: l.icon }));
    const opps =
      debounced.length >= 2
        ? (data?.items ?? []).map((o) => ({
            key: o.id,
            label: o.title,
            sub: `${OPPORTUNITY_TYPE_META[o.type].label} · ${o.organization.name} · ${deadlineLabel(o.deadline)}`,
            to: `/opportunities/${o.slug}`,
            icon: <Briefcase className="size-4" />,
          }))
        : [];
    return [...opps, ...nav];
  }, [links, q, debounced, data]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <MagnifyingGlass className="size-5 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(items.length - 1, a + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  }
                  if (e.key === "Enter" && items[active]) go(items[active].to);
                }}
                placeholder="Search jobs, internships, skills, pages…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
              {isFetching ? <Spinner className="size-4 text-muted" /> : <Kbd>Esc</Kbd>}
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No matches for “{q}”.</li>}
              {items.map((it, i) => (
                <motion.li
                  key={it.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.025 }}
                >
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(it.to)}
                    className={cn("relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active ? "text-ink" : "text-ink-soft")}
                  >
                    {i === active && <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-xl bg-surface-2" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                    <span className="relative grid size-8 place-items-center rounded-lg bg-well text-muted">{it.icon}</span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.label}</span>
                      <span className="block truncate text-xs text-muted">{it.sub}</span>
                    </span>
                    {i === active ? <ArrowElbowDownLeft className="relative size-4 text-muted" /> : <ArrowRight className="relative size-4 text-transparent" />}
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
