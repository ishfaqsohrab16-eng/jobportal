import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle, Info, Megaphone, Warning, WarningOctagon, Wrench, X } from "@phosphor-icons/react";
import type { AnnouncementDTO, AnnouncementType } from "@digibizz/jobs-shared";
import { usePublicAnnouncementsQuery } from "@/store/api";
import { cn } from "@/lib/cn";

/** Colours and icon for each banner type, built from the theme tokens so both themes work. */
export const ANNOUNCEMENT_STYLE: Record<AnnouncementType, { bar: string; chip: string; icon: ReactNode }> = {
  announcement: {
    bar: "bg-violet-soft text-ink border-[color-mix(in_oklab,var(--violet)_35%,transparent)]",
    chip: "bg-violet text-white",
    icon: <Megaphone weight="fill" className="size-4" />,
  },
  info: {
    bar: "bg-info-soft text-ink border-[color-mix(in_oklab,var(--info)_35%,transparent)]",
    chip: "bg-info text-white",
    icon: <Info weight="fill" className="size-4" />,
  },
  success: {
    bar: "bg-brand-soft text-ink border-[color-mix(in_oklab,var(--brand)_35%,transparent)]",
    chip: "bg-brand text-[#04120b]",
    icon: <CheckCircle weight="fill" className="size-4" />,
  },
  warning: {
    bar: "bg-warn-soft text-ink border-[color-mix(in_oklab,var(--warn)_45%,transparent)]",
    chip: "bg-warn text-[#1c1204]",
    icon: <Warning weight="fill" className="size-4" />,
  },
  urgent: {
    bar: "bg-danger text-white border-transparent",
    chip: "bg-white text-danger",
    icon: <WarningOctagon weight="fill" className="size-4" />,
  },
  maintenance: {
    bar: "bg-accent-soft text-ink border-[color-mix(in_oklab,var(--accent)_40%,transparent)]",
    chip: "bg-accent text-[#1c1204]",
    icon: <Wrench weight="fill" className="size-4" />,
  },
};

type BannerData = Pick<AnnouncementDTO, "type" | "title" | "message" | "linkUrl" | "linkLabel" | "dismissible">;

const dismissKey = (a: AnnouncementDTO) => `announcement-dismissed:${a.id}:${a.updatedAt}`;
const isDismissed = (a: AnnouncementDTO) => {
  try {
    return localStorage.getItem(dismissKey(a)) === "1";
  } catch {
    return false;
  }
};

/** One banner. Also used as the live preview in the admin editor. */
export function AnnouncementBanner({ a, onDismiss, className }: { a: BannerData; onDismiss?: () => void; className?: string }) {
  const style = ANNOUNCEMENT_STYLE[a.type] ?? ANNOUNCEMENT_STYLE.announcement;
  const external = /^https?:\/\//i.test(a.linkUrl);
  const linkClass = "inline-flex items-center gap-1 whitespace-nowrap font-semibold underline underline-offset-2 hover:no-underline";
  const label = (
    <>
      {a.linkLabel || "Learn more"} <ArrowRight weight="bold" className="size-3.5" />
    </>
  );
  return (
    <div role={a.type === "urgent" || a.type === "warning" ? "alert" : "status"} className={cn("border-b text-sm", style.bar, className)}>
      <div className="mx-auto flex max-w-screen-2xl items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6">
        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md sm:mt-0", style.chip)}>{style.icon}</span>
        <p className="min-w-0 flex-1 leading-snug">
          {a.title && <b className="mr-1.5 font-semibold">{a.title}</b>}
          <span className="whitespace-pre-line">{a.message}</span>
          {a.linkUrl && (
            <span className="ml-2 inline-block">
              {external ? (
                <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {label}
                </a>
              ) : (
                <Link to={a.linkUrl} className={linkClass}>
                  {label}
                </Link>
              )}
            </span>
          )}
        </p>
        {a.dismissible && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss announcement" className="-mr-1 grid size-7 shrink-0 place-items-center rounded-md opacity-70 transition-opacity hover:opacity-100">
            <X weight="bold" className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Every live announcement, stacked above the whole app on every page. */
export function AnnouncementBar() {
  const { data } = usePublicAnnouncementsQuery(undefined, { pollingInterval: 5 * 60_000 });
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const visible = (data ?? []).filter((a) => !a.dismissible || !(hidden.has(dismissKey(a)) || isDismissed(a)));
  return (
    <AnimatePresence initial={false}>
      {visible.map((a) => (
        <motion.div key={a.id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <AnnouncementBanner
            a={a}
            onDismiss={() => {
              try {
                localStorage.setItem(dismissKey(a), "1");
              } catch {
                /* storage blocked: still hidden for this visit */
              }
              setHidden((prev) => new Set(prev).add(dismissKey(a)));
            }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
