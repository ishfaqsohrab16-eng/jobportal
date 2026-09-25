import { useId } from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * DigiBizz Jobs mark: a green tile holding a geometric "d" (bowl + stem)
 * with pixel squares breaking away from the corner - a nod to the pixel
 * scatter in the original DigiBizz logo. It draws itself in on mount and
 * the pixels drift out on hover.
 */

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (d: number) => ({ pathLength: 1, opacity: 1, transition: { pathLength: { duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: d }, opacity: { duration: 0.1, delay: d } } }),
};
const pop: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: (d: number) => ({ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 520, damping: 14, delay: d } }),
  hover: (i: number) => ({ x: [0, 2 + i, 0], y: [0, -2 - i * 1.5, 0], rotate: [0, 18 * (i % 2 ? -1 : 1), 0], transition: { duration: 0.9, ease: "easeInOut" } }),
};

export function LogoMark({ size = 36, animate = true, className }: { size?: number; animate?: boolean; className?: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cn("shrink-0", className)}
      initial={animate ? "hidden" : "show"}
      animate="show"
      whileHover="hover"
      aria-hidden
    >
      <defs>
        <linearGradient id={`t${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1ec27c" />
          <stop offset="1" stopColor="#0a6b41" />
        </linearGradient>
        <radialGradient id={`h${gid}`} cx=".25" cy=".15" r=".9">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.rect
        width="40"
        height="40"
        rx="11.5"
        fill={`url(#t${gid})`}
        variants={{ hidden: { scale: 0.6, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } } }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <rect width="40" height="40" rx="11.5" fill={`url(#h${gid})`} />
      <motion.circle cx="16.5" cy="23.5" r="7" fill="none" stroke="#fff" strokeWidth="4.2" variants={draw} custom={0.15} />
      <motion.path d="M23.6 9.5v21" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" variants={draw} custom={0.35} />
      <motion.rect x="28" y="6" width="5.2" height="5.2" rx="1.3" fill="#f5a524" variants={pop} custom={0.8} style={{ originX: "50%", originY: "50%" }} />
      <motion.rect x="33.6" y="12.6" width="3" height="3" rx=".8" fill="#fff" fillOpacity=".9" variants={pop} custom={0.95} style={{ originX: "50%", originY: "50%" }} />
      <motion.rect x="29.2" y="15.4" width="2.4" height="2.4" rx=".6" fill="#f5a524" fillOpacity=".75" variants={pop} custom={1.05} style={{ originX: "50%", originY: "50%" }} />
    </motion.svg>
  );
}

export function Logo({ compact, className, animate = true }: { compact?: boolean; className?: string; animate?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark animate={animate} />
      {!compact && (
        <motion.span
          className="flex flex-col leading-none"
          initial={animate ? { opacity: 0, x: -6 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <span className="font-display text-[19px] font-extrabold tracking-[-0.035em] text-ink">
            digibizz<span className="text-brand">.</span>
          </span>
          <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.32em] text-accent">jobs portal</span>
        </motion.span>
      )}
    </span>
  );
}
