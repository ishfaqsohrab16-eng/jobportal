import { motion } from "motion/react";
import { useTheme } from "@/hooks";
import { LogoMark } from "@/components/brand/Logo";

/** Keeps <html data-theme> in sync with the store. */
export function ThemeSync() {
  useTheme();
  return null;
}

/** Full-screen loader: the mark draws itself while a light sweep runs underneath. */
export function Splash() {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-frame">
      <div className="flex flex-col items-center gap-5">
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <LogoMark size={64} />
        </motion.div>
        <div className="relative h-1 w-32 overflow-hidden rounded-full bg-surface-2">
          <motion.span
            className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent"
            animate={{ x: ["-100%", "220%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
