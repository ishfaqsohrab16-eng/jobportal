import { useMemo } from "react";
import { motion } from "motion/react";

const COLORS = ["var(--brand)", "var(--accent)", "var(--violet)", "var(--teal)", "#ffffff"];

/** One-shot confetti burst from the centre of its (relative) parent. */
export function Confetti({ count = 46 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 180;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          r: Math.random() * 540 - 270,
          w: 5 + Math.random() * 6,
          h: 8 + Math.random() * 8,
          c: COLORS[i % COLORS.length],
          d: Math.random() * 0.15,
        };
      }),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-visible">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ width: p.w, height: p.h, background: p.c }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 220], rotate: p.r, opacity: [1, 1, 0], scale: 1 }}
          transition={{ duration: 1.8, delay: p.d, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
