import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Eye, EyeSlash, LockKey, WarningCircle } from "@phosphor-icons/react";
import { passwordSchema } from "@digibizz/jobs-shared";
import { z } from "zod";
import { useResetPasswordMutation } from "@/store/api";
import { useDocumentTitle, useToast } from "@/hooks";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { AuthLayout } from "./AuthLayout";

const formSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

const strength = (pw: string) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
};
const LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const COLORS = ["var(--danger)", "var(--danger)", "var(--warn)", "var(--teal)", "var(--brand)"];

export default function ResetPassword() {
  useDocumentTitle("Set a new password");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const [reset, { isLoading }] = useResetPasswordMutation();
  const [showPw, setShowPw] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [linkDead, setLinkDead] = useState(!token);
  const shake = useAnimationControls();

  const { register, handleSubmit, watch, formState, setError } = useForm<z.input<typeof formSchema>>({ resolver: zodResolver(formSchema), mode: "onTouched" });
  const pw = watch("password") ?? "";
  const s = strength(pw);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user } = await reset({ token, password: values.password }).unwrap();
      setCelebrate((c) => c + 1);
      toast.success("Password updated", "You're signed in.");
      window.setTimeout(() => navigate(user.role === "admin" ? "/admin" : "/me", { replace: true }), 900);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields.token) setLinkDead(true);
      else setError("password", { message: errorMessage(err) });
      void shake.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } });
      toast.error("Couldn't reset your password", errorMessage(err));
    }
  });

  return (
    <AuthLayout
      mood={{ glow: s >= 3, shy: pwFocus && !showPw, celebrate }}
      title={linkDead ? "This link no longer works" : "Set a new password"}
      subtitle={
        linkDead
          ? "Reset links can be used once and expire after about an hour."
          : "Choose a password you don't use anywhere else. You'll be signed in straight away."
      }
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {linkDead ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
            <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" />
            <p>Request a fresh link and use it as soon as it arrives.</p>
          </div>
          <Link to="/forgot-password">
            <Button variant="primary" size="lg" block chip={<ArrowRight weight="bold" className="size-4" />}>
              Request a new link
            </Button>
          </Link>
        </motion.div>
      ) : (
        <motion.form animate={shake} onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="New password" error={formState.errors.password?.message}>
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
                  autoFocus
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
          <Field label="Confirm new password" error={formState.errors.confirm?.message}>
            {(id) => <Input id={id} type={showPw ? "text" : "password"} autoComplete="new-password" leading={<LockKey className="size-4" />} invalid={!!formState.errors.confirm} {...register("confirm")} />}
          </Field>
          <Button type="submit" variant="primary" size="lg" block loading={isLoading} chip={<ArrowRight weight="bold" className="size-4" />}>
            Save new password
          </Button>
        </motion.form>
      )}
    </AuthLayout>
  );
}
