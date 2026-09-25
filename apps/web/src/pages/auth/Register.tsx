import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Envelope, Eye, EyeSlash, LockKey, Phone, User } from "@phosphor-icons/react";
import { registerSchema, type RegisterInput } from "@digibizz/jobs-shared";
import { useRegisterMutation } from "@/store/api";
import { useDocumentTitle, useToast } from "@/hooks";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { AuthLayout } from "./AuthLayout";
import { safeNext } from "./Login";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
}
const LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const COLORS = ["var(--danger)", "var(--danger)", "var(--warn)", "var(--teal)", "var(--brand)"];

export default function Register() {
  useDocumentTitle("Create account");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [signup, { isLoading }] = useRegisterMutation();
  const [showPw, setShowPw] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const shake = useAnimationControls();

  const { register, handleSubmit, watch, formState, setError } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), mode: "onTouched" });
  const pw = watch("password") ?? "";
  const s = strength(pw);
  const glow = (watch("name") ?? "").trim().length > 1 && /\S+@\S+\.\S+/.test(watch("email") ?? "");

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signup(values).unwrap();
      setCelebrate((c) => c + 1);
      toast.success("Account created", "Add your resume to apply in one click.");
      window.setTimeout(() => navigate(safeNext(params.get("next")) ?? "/me/profile", { replace: true }), 900);
    } catch (err) {
      for (const [k, v] of Object.entries(fieldErrors(err))) setError(k as keyof RegisterInput, { message: v });
      void shake.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } });
      toast.error("Couldn't create account", errorMessage(err));
    }
  });

  return (
    <AuthLayout
      mood={{ glow, shy: pwFocus && !showPw, celebrate }}
      title="Create your account"
      subtitle="It's free. Apply to jobs, internships and trainings with one profile."
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login${params.size ? `?${params}` : ""}`} className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <motion.form animate={shake} onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" error={formState.errors.name?.message}>
          {(id) => <Input id={id} autoComplete="name" placeholder="Ayesha Baloch" leading={<User className="size-4" />} invalid={!!formState.errors.name} {...register("name")} autoFocus />}
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          {(id) => <Input id={id} type="email" autoComplete="email" placeholder="you@example.com" leading={<Envelope className="size-4" />} invalid={!!formState.errors.email} {...register("email")} />}
        </Field>
        <Field label="Phone" hint="optional" error={formState.errors.phone?.message}>
          {(id) => <Input id={id} type="tel" autoComplete="tel" placeholder="03xx xxxxxxx" leading={<Phone className="size-4" />} {...register("phone")} />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          {(id) => {
            const reg = register("password");
            return (
              <Input
                id={id}
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                leading={<LockKey className="size-4" />}
                invalid={!!formState.errors.password}
                {...reg}
                onFocus={() => setPwFocus(true)}
                onBlur={(e) => {
                  setPwFocus(false);
                  void reg.onBlur(e);
                }}
                trailing={
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
            );
          }}
        </Field>
        {pw && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.span className="block h-full rounded-full" initial={false} animate={{ width: i < s ? "100%" : "0%", backgroundColor: COLORS[s] }} transition={{ duration: 0.35 }} />
                </span>
              ))}
            </div>
            <p className={cn("text-xs", s >= 3 ? "text-brand" : "text-muted")}>{LABELS[s]}</p>
          </motion.div>
        )}
        <Button type="submit" variant="primary" size="lg" block loading={isLoading} chip={<ArrowRight weight="bold" className="size-4" />}>
          Create account
        </Button>
        <p className="text-center text-xs text-muted">By continuing you agree to share your profile with organizations you apply to.</p>
      </motion.form>
    </AuthLayout>
  );
}
