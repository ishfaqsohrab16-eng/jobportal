import { lazy, Suspense, type ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Briefcase, GraduationCap, Student } from "@phosphor-icons/react";
import { Logo } from "@/components/brand/Logo";
import type { MascotMood } from "@/components/brand/RiveMascot";
import { useStatsQuery } from "@/store/api";
import { CountUp } from "@/components/motion";
import { ease } from "@/lib/motion";

const RiveMascot = lazy(() => import("@/components/brand/RiveMascot"));

function FloatingStat({ icon, label, value, className, delay }: { icon: ReactNode; label: string; value: number; className: string; delay: number }) {
  return (
    <motion.div
      className={`absolute hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md xl:flex ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
      transition={{ opacity: { delay, duration: 0.6 }, scale: { delay, duration: 0.6 }, y: { delay: delay + 0.6, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-[#2fd08a]/15 text-[#2fd08a]">{icon}</span>
      <div>
        <p className="font-display text-lg font-semibold leading-none text-white">
          <CountUp value={value} />
        </p>
        <p className="mt-1 text-[11px] text-white/50">{label}</p>
      </div>
    </motion.div>
  );
}

export function AuthLayout({ mood, title, subtitle, children, footer }: { mood: MascotMood; title: string; subtitle: ReactNode; children: ReactNode; footer: ReactNode }) {
  const { data: stats } = useStatsQuery();
  return (
    <div className="flex min-h-dvh bg-frame p-0 sm:p-2">
      {/* Mascot canvas - always dark, like the Rive artboard */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative hidden flex-1 overflow-hidden rounded-[22px] bg-[#050606] lg:block"
      >
        <div aria-hidden className="absolute inset-0 bg-dots text-white/60 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div aria-hidden className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-white/[0.04]" />
        <div aria-hidden className="absolute left-1/2 top-1/2 size-[760px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dashed border-white/[0.05] [animation-direction:reverse]" />
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          animate={{ background: mood.glow ? "radial-gradient(closest-side, rgba(47,208,138,0.28), transparent)" : "radial-gradient(closest-side, rgba(255,255,255,0.06), transparent)" }}
          transition={{ duration: 0.8 }}
        />

        <div className="absolute left-8 top-8 z-10">
          <Link to="/" className="inline-block [&_.text-ink]:text-white">
            <Logo />
          </Link>
        </div>

        <div className="absolute inset-0 grid place-items-center">
          <Suspense fallback={<div className="size-[min(62vh,560px)]" />}>
            <RiveMascot mood={mood} className="size-[min(62vh,560px)]" />
          </Suspense>
        </div>

        <FloatingStat icon={<Briefcase className="size-5" />} label="open jobs" value={stats?.open.job ?? 0} className="left-[10%] top-[24%]" delay={0.6} />
        <FloatingStat icon={<Student className="size-5" />} label="internship seats" value={stats?.open.internship ?? 0} className="right-[9%] top-[40%]" delay={0.8} />
        <FloatingStat icon={<GraduationCap className="size-5" />} label="program & training seats" value={(stats?.open.program ?? 0) + (stats?.open.training ?? 0)} className="bottom-[20%] left-[14%]" delay={1} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease }} className="absolute inset-x-8 bottom-8 z-10 flex items-end justify-between gap-6">
          <p className="max-w-sm font-display text-2xl font-semibold leading-tight text-white">
            One profile. Every opportunity in <span className="text-[#2fd08a]">Balochistan</span> and beyond.
          </p>
          <p className="text-right text-[10.5px] leading-snug text-white/30">
            Mascot: “Mazerance” by oneblvckboi
            <br />
            made with Rive
          </p>
        </motion.div>
      </motion.aside>

      {/* Form side */}
      <main className="relative flex w-full flex-col bg-paper px-5 py-8 sm:rounded-[22px] sm:border sm:border-line sm:px-10 lg:w-[520px] lg:shrink-0 xl:w-[560px]">
        <div className="lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease }} className="mt-8">
            {children}
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center text-sm text-muted">
          {footer}
        </motion.div>
      </main>
    </div>
  );
}
