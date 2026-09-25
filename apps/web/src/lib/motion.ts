import type { Transition, Variants } from "motion/react";

/** Motion vocabulary shared by every screen, so the whole app moves the same way. */

export const ease = [0.16, 1, 0.3, 1] as const;
export const spring: Transition = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 };
export const softSpring: Transition = { type: "spring", stiffness: 180, damping: 24 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const stagger = (gap = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Dashboard intro: panels rise in one after another, like the reference intro timeline. */
export const panelIntro: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease, delay: 0.08 * i },
  }),
};
