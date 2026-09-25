import { forwardRef, useId, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line bg-well px-3.5 text-sm text-ink placeholder:text-muted/70 " +
  "transition-[border-color,box-shadow,background-color] duration-200 outline-none " +
  "hover:border-line-strong focus:border-brand focus:bg-surface focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_16%,transparent)] " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_14%,transparent)] " +
  "disabled:opacity-60";

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
        {children}
      </label>
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          className="overflow-hidden pt-1.5 text-[12.5px] text-danger"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (id: string) => ReactNode;
}

/** Label + control + animated error, wired with a shared id. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} hint={hint}>
          {label}
        </Label>
      )}
      {children(id)}
      <FieldError message={error} />
    </div>
  );
}

type InputProps = ComponentProps<"input"> & { invalid?: boolean; leading?: ReactNode; trailing?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, leading, trailing, ...rest }, ref) {
  if (!leading && !trailing) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-11", className)} {...rest} />;
  }
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{leading}</span>}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, "h-11", leading && "pl-10", trailing && "pr-11", className)}
        {...rest}
      />
      {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea"> & { invalid?: boolean }>(function Textarea(
  { className, invalid, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(control, "resize-y py-2.5 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select"> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-11 appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <CaretDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
});

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium">{label}</span>}
          {description && <span className="block text-[12.5px] text-muted">{description}</span>}
        </span>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
          className={cn("size-5 rounded-full bg-white shadow-md", checked ? "ml-auto" : "ml-0")}
        />
      </button>
    </label>
  );
}

/** Free-text chips (skills, benefits...). Enter or comma adds; Backspace on empty removes the last. */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  max = 30,
  id,
  invalid,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  id?: string;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "").trim();
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return;
    onChange([...value, v]);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div
      aria-invalid={invalid || undefined}
      className={cn(control, "flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-brand focus-within:bg-surface")}
    >
      <AnimatePresence initial={false}>
        {value.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-2 py-1 pl-2.5 pr-1 text-[12.5px] font-medium"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="grid size-5 place-items-center rounded-md text-muted hover:bg-line hover:text-ink"
            >
              <X className="size-3" weight="bold" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          add(draft);
          setDraft("");
        }}
        placeholder={value.length ? "" : placeholder}
        className="h-8 min-w-24 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted/70"
      />
    </div>
  );
}

/** One item per line <-> string[] (requirements, benefits...). */
export function LinesInput({
  value,
  onChange,
  id,
  rows = 4,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Textarea
      id={id}
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split("\n")
            .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
            .filter(Boolean),
        );
      }}
    />
  );
}
