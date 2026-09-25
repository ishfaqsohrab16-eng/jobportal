import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { useShellHeader } from "@/components/layout/ShellContext";
import { LogoMark } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  useShellHeader({ title: "Page not found" });
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <div className="relative mx-auto w-fit">
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="font-display text-[140px] font-extrabold leading-none tracking-tighter text-gradient-brand sm:text-[200px]"
          >
            404
          </motion.p>
          <motion.div className="absolute -right-6 top-4" animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <LogoMark size={56} />
          </motion.div>
        </div>
        <h2 className="mt-2 text-2xl font-semibold">This page wandered off</h2>
        <p className="mt-2 text-muted">The link may be broken, or the opportunity has been removed.</p>
        <div className="mt-8 flex justify-center">
          <ButtonLink to="/" variant="primary" icon={<ArrowLeft className="size-4" />}>
            Back home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
