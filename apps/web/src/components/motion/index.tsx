import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react";
import { cn } from "@/lib/cn";
import { ease, fadeUp, stagger } from "@/lib/motion";

/** Fades/slides children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  variants = fadeUp,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
  as?: "div" | "section" | "li";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}

/** Container that staggers its motion children in when visible. */
export function Stagger({ children, className, gap = 0.07, delay = 0, as = "div" }: { children: ReactNode; className?: string; gap?: number; delay?: number; as?: "div" | "ul" | "ol" }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={stagger(gap, delay)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      {children}
    </Comp>
  );
}

/** Number that counts up from 0 when it first becomes visible. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-US"), duration = 1.4, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease });
    return () => controls.stop();
  }, [inView, value, duration, reduce, mv]);
  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </motion.span>
  );
}

/** Headline that reveals word by word with a soft blur. */
export function WordReveal({ text, className, delay = 0, highlight }: { text: string; className?: string; delay?: number; highlight?: string[] }) {
  const words = text.split(" ");
  return (
    <motion.span className={cn("inline", className)} initial="hidden" animate="show" variants={stagger(0.06, delay)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span
            className={cn("inline-block", highlight?.includes(w.replace(/[^\w]/g, "")) && "text-gradient-brand")}
            variants={{
              hidden: { y: "110%", opacity: 0, filter: "blur(8px)" },
              show: { y: "0%", opacity: 1, filter: "blur(0px)", transition: { duration: 0.8, ease } },
            }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/**
 * The gradient mini bar chart from the dashboard KPI cards. Bars grow from
 * the bottom one after another; `tint` is any CSS colour.
 */
export function MiniBars({ values, tint, className, height = 72 }: { values: number[]; tint: string; className?: string; height?: number }) {
  const max = Math.max(1, ...values);
  const gid = useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${values.length * 14} ${height}`} className={cn("overflow-visible", className)} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint} />
          <stop offset="1" stopColor={tint} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {values.map((v, i) => {
        const h = Math.max(4, (v / max) * (height - 4));
        return (
          <motion.rect
            key={i}
            x={i * 14 + 3}
            width={8}
            rx={2}
            fill={`url(#b${gid})`}
            initial={{ height: 0, y: height }}
            whileInView={{ height: h, y: height - h }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.25 + i * 0.07 }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Smooth area chart that draws itself left-to-right (the "flow" chart in the
 * dashboard design), with a hover crosshair + tooltip.
 */
export function FlowChart({
  series,
  labels,
  height = 220,
  className,
  format = (n) => String(n),
}: {
  series: { name: string; color: string; values: number[] }[];
  labels: string[];
  height?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const gid = useId().replace(/:/g, "");
  const width = 600;
  const n = Math.max(2, labels.length);
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.15;
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => height - (v / max) * (height - 16) - 8;
  const path = (vals: number[]) =>
    vals.reduce((d, v, i) => {
      if (i === 0) return `M ${x(0)} ${y(v)}`;
      const px = x(i - 1);
      const py = y(vals[i - 1]!);
      const cx = (px + x(i)) / 2;
      return `${d} C ${cx} ${py}, ${cx} ${y(v)}, ${x(i)} ${y(v)}`;
    }, "");
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (n - 1)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`f${gid}${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={width} y1={height * g} y2={height * g} stroke="var(--line)" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s, i) => (
          <g key={s.name}>
            <motion.path
              d={`${path(s.values)} L ${width} ${height} L 0 ${height} Z`}
              fill={`url(#f${gid}${i})`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.6 + i * 0.2 }}
            />
            <motion.path
              d={path(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease, delay: 0.2 + i * 0.2 }}
            />
          </g>
        ))}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1="0" y2={height} stroke="var(--line-strong)" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover != null && labels[hover] && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: `clamp(0px, calc(${(hover / (n - 1)) * 100}% - 72px), calc(100% - 150px))` }}
        >
          <p className="mb-1 font-medium text-muted">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold tabular-nums">{format(s.values[hover] ?? 0)}</span>
            </p>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/** Horizontal meter bar that fills when visible. */
export function Meter({ value, max, color, className }: { value: number; max: number; color: string; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-well", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${color} 40%, transparent), ${color})` }}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease }}
      />
    </div>
  );
}

/** Infinite horizontal marquee (content is duplicated for a seamless loop). */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mask-fade-x overflow-hidden", className)}>
      <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        <div className="flex gap-3">{children}</div>
        <div className="flex gap-3" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
