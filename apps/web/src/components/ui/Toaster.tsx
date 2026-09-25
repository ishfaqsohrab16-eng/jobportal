import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import { useAppDispatch, useAppSelector } from "@/store";
import { dismissToast, type Toast } from "@/store/uiSlice";
import { cn } from "@/lib/cn";

const TTL = 4800;

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const id = window.setTimeout(() => dispatch(dismissToast(toast.id)), TTL);
    return () => window.clearTimeout(id);
  }, [dispatch, toast.id]);

  const Icon = toast.tone === "success" ? CheckCircle : toast.tone === "error" ? WarningCircle : Info;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dispatch(dismissToast(toast.id))}
      className="panel pointer-events-auto relative flex w-[min(92vw,380px)] items-start gap-3 overflow-hidden p-4 shadow-2xl"
    >
      <Icon
        weight="fill"
        className={cn("mt-0.5 size-5 shrink-0", toast.tone === "success" ? "text-brand" : toast.tone === "error" ? "text-danger" : "text-info")}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.body && <p className="mt-0.5 text-[13px] text-muted">{toast.body}</p>}
      </div>
      <button onClick={() => dispatch(dismissToast(toast.id))} aria-label="Dismiss" className="text-muted hover:text-ink">
        <X className="size-4" />
      </button>
      <motion.span
        className={cn("absolute bottom-0 left-0 h-0.5", toast.tone === "error" ? "bg-danger" : "bg-brand")}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: TTL / 1000, ease: "linear" }}
      />
    </motion.li>
  );
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <ol aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
