import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, IdentificationBadge, NotePencil, PaperPlaneTilt, Paperclip } from "@phosphor-icons/react";
import { applySchema, deadlineLabel, DIGIBIZZ, OPPORTUNITY_TYPE_META } from "@digibizz/jobs-shared";
import { useApplyMutation, useOpportunityQuery } from "@/store/api";
import { useAuth, useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { ResumeDropzone } from "@/components/ResumeDropzone";
import { Confetti } from "@/components/motion/Confetti";
import { Button, ButtonLink, EmptyState, Field, Input, Skeleton, Textarea } from "@/components/ui";
import { PublisherMark } from "@/components/opportunity";
import { cn } from "@/lib/cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { ease } from "@/lib/motion";

const STEPS = [
  { key: "you", label: "Your details", icon: IdentificationBadge },
  { key: "resume", label: "Resume", icon: Paperclip },
  { key: "letter", label: "Cover letter", icon: NotePencil },
  { key: "review", label: "Review", icon: PaperPlaneTilt },
] as const;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <motion.span
              animate={{ scale: current ? 1.08 : 1 }}
              className={cn(
                "relative grid size-9 shrink-0 place-items-center rounded-xl border text-sm transition-colors duration-300",
                done ? "border-brand bg-brand text-[#04120b]" : current ? "border-brand text-brand" : "border-line text-muted",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.span key="d" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}>
                    <Check weight="bold" className="size-4" />
                  </motion.span>
                ) : (
                  <motion.span key="i" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <s.icon className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
              {current && <motion.span layoutId="step-ring" className="absolute -inset-1 rounded-[14px] border border-brand/40" />}
            </motion.span>
            <span className={cn("hidden text-[13px] font-medium md:block", current ? "text-ink" : "text-muted")}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span className="absolute inset-y-0 left-0 bg-brand" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.5, ease }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Apply() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: o, isLoading } = useOpportunityQuery(slug);
  const [apply, { isLoading: sending }] = useApplyMutation();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ phone: user?.phone ?? "", city: user?.city ?? "", coverLetter: "", expectedSalary: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  useShellHeader({ title: o ? `Apply · ${o.title}` : "Apply", subtitle: DIGIBIZZ.name }, [o?.id]);

  // The session may resolve after first render: prefill contact details once it does.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, phone: f.phone || user.phone, city: f.city || user.city }));
  }, [user]);

  if (authLoading || isLoading) return <div className="p-6"><Skeleton className="mx-auto h-[480px] max-w-3xl" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!o) return <div className="p-6"><EmptyState title="Opportunity not found" action={<ButtonLink to="/jobs">Browse jobs</ButtonLink>} /></div>;
  if (user.role === "admin") return <div className="p-6"><EmptyState title="Admins can't apply" body="Sign in with a candidate account to apply." /></div>;
  if (o.viewer?.applicationStatus && !done) return <Navigate to="/me" replace />;

  const source = params.get("ref") || "direct";
  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const next = () => {
    if (step === 0) {
      const e: Record<string, string> = {};
      if (form.phone.trim().length < 7) e.phone = "Enter a phone number we can reach you on";
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    if (step === 1 && !user.resume) {
      toast.error("Resume required", "Upload your resume to continue.");
      return;
    }
    go(step + 1);
  };

  const submit = async () => {
    const parsed = applySchema.safeParse({
      phone: form.phone,
      city: form.city,
      coverLetter: form.coverLetter,
      expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : null,
      source,
    });
    if (!parsed.success) {
      toast.error("Please check your details");
      go(0);
      return;
    }
    try {
      await apply({ id: o.id, body: parsed.data }).unwrap();
      setDone(true);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error("Couldn't submit", errorMessage(err));
    }
  };

  if (done) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 py-10">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="panel relative max-w-lg p-10 text-center">
          <Confetti />
          <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }} className="mx-auto grid size-20 place-items-center rounded-3xl bg-brand text-[#04120b] shadow-[0_20px_50px_-15px_var(--brand)]">
            <CheckCircle weight="fill" className="size-11" />
          </motion.span>
          <h2 className="mt-6 text-3xl font-bold">Application sent!</h2>
          <p className="mt-3 text-muted">
            {DIGIBIZZ.name} will review your application for <b className="text-ink">{o.title}</b>. We’ll update the status in your dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <ButtonLink to="/me" variant="primary" chip={<ArrowRight className="size-3.5" />}>
              Track application
            </ButtonLink>
            <ButtonLink to={`/${OPPORTUNITY_TYPE_META[o.type].path}`}>Keep browsing</ButtonLink>
          </div>
        </motion.div>
      </div>
    );
  }

  const isPaid = o.type === "job" || o.type === "internship";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link to={`/opportunities/${o.slug}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to details
      </Link>
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-4 border-b border-line p-5">
          <PublisherMark size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{o.title}</p>
            <p className="truncate text-sm text-muted">
              {DIGIBIZZ.name} · {deadlineLabel(o.deadline)}
            </p>
          </div>
          {source !== "direct" && <span className="hidden rounded-full bg-violet-soft px-2.5 py-1 text-xs font-medium text-violet sm:block">via {source}</span>}
        </div>
        <div className="border-b border-line p-5">
          <Stepper step={step} />
        </div>

        <div className="relative min-h-[320px] overflow-hidden p-5 sm:p-6">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.35, ease }}
            >
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-well/60 p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wider text-muted">Applying as</p>
                    <p className="mt-1 font-semibold">{user.name}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                  <Field label="Phone" error={errors.phone}>
                    {(id) => <Input id={id} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03xx xxxxxxx" invalid={!!errors.phone} autoFocus />}
                  </Field>
                  <Field label="City">
                    {(id) => <Input id={id} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Quetta" />}
                  </Field>
                </div>
              )}
              {step === 1 && (
                <div>
                  <p className="mb-4 text-sm text-muted">Your resume is saved to your profile, so next time applying takes seconds.</p>
                  <ResumeDropzone user={user} />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <Field label="Cover letter" hint={`${form.coverLetter.length}/4000 · optional`}>
                    {(id) => (
                      <Textarea
                        id={id}
                        rows={8}
                        maxLength={4000}
                        value={form.coverLetter}
                        onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                        placeholder={`Tell ${DIGIBIZZ.name} why you're a great fit…`}
                      />
                    )}
                  </Field>
                  {isPaid && (
                    <Field label={`Expected ${o.type === "internship" ? "stipend" : "salary"} (${o.salaryCurrency}/month)`} hint="optional">
                      {(id) => <Input id={id} type="number" min={0} value={form.expectedSalary} onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })} />}
                    </Field>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-3">
                  {[
                    { k: "Contact", v: `${form.phone}${form.city ? ` · ${form.city}` : ""}`, s: 0 },
                    { k: "Resume", v: user.resume?.fileName ?? "—", s: 1 },
                    { k: "Cover letter", v: form.coverLetter ? `${form.coverLetter.slice(0, 140)}${form.coverLetter.length > 140 ? "…" : ""}` : "Not included", s: 2 },
                  ].map((r, i) => (
                    <motion.div key={r.k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-well/60 p-4">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wider text-muted">{r.k}</p>
                        <p className="mt-1 break-words text-sm">{r.v}</p>
                      </div>
                      <button onClick={() => go(r.s)} className="text-sm font-medium text-brand hover:underline">
                        Edit
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line bg-well/40 p-4">
          <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} icon={<ArrowLeft className="size-4" />}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next} chip={<ArrowRight className="size-3.5" />}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" onClick={submit} loading={sending} chip={<PaperPlaneTilt className="size-3.5" />}>
              Submit application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
