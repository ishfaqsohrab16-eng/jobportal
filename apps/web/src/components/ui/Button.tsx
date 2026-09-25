import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/cn";
import { Spinner } from "./Feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "transition-[background-color,border-color,color,box-shadow,opacity] duration-200 " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-[#04120b] hover:bg-brand-strong shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand)_60%,transparent),0_8px_24px_-10px_var(--brand)]",
  accent: "bg-accent text-[#1c1204] hover:brightness-110 shadow-[0_8px_24px_-12px_var(--accent)]",
  secondary: "bg-surface-2 text-ink border border-line hover:border-line-strong hover:bg-[color-mix(in_oklab,var(--surface-2)_80%,var(--ink)_6%)]",
  outline: "border border-line-strong text-ink hover:bg-surface-2",
  ghost: "text-ink-soft hover:text-ink hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-2xl",
};

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  /** Icon shown in a small square chip on the right, like "Add Money [+]". */
  chip?: ReactNode;
  block?: boolean;
}

export type ButtonProps = Common & Omit<ComponentProps<typeof motion.button>, "children"> & { children?: ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, chip, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], block && "w-full", chip && "pr-1.5", className)}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
      {chip && (
        <span className="ml-1 grid size-6 place-items-center rounded-md bg-[color-mix(in_oklab,currentColor_14%,transparent)]">{chip}</span>
      )}
    </motion.button>
  );
});

export function ButtonLink({
  variant = "secondary",
  size = "md",
  icon,
  chip,
  block,
  className,
  children,
  ...rest
}: Common & LinkProps & { children?: ReactNode }) {
  return (
    <motion.span className={cn("inline-flex", block && "w-full")} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
      <Link className={cn(base, variants[variant], sizes[size], block && "w-full", chip && "pr-1.5", className)} {...rest}>
        {icon}
        {children}
        {chip && (
          <span className="ml-1 grid size-6 place-items-center rounded-md bg-[color-mix(in_oklab,currentColor_14%,transparent)]">{chip}</span>
        )}
      </Link>
    </motion.span>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, "icon" | "chip"> & { label: string; dot?: boolean }>(
  function IconButton({ label, dot, className, children, size = "md", variant = "secondary", ...rest }, ref) {
    const dims = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
    return (
      <Button ref={ref} aria-label={label} title={label} variant={variant} className={cn("!px-0", dims, className)} {...rest}>
        {children}
        {dot && (
          <span className="absolute right-2 top-2 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-danger" />
          </span>
        )}
      </Button>
    );
  },
);
