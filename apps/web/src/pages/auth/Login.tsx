import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Envelope, Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { loginSchema, type LoginInput } from "@digibizz/jobs-shared";
import { useLoginMutation } from "@/store/api";
import { useDocumentTitle, useToast } from "@/hooks";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";

/** Only allow same-site relative redirects. */
export const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export default function Login() {
  useDocumentTitle("Sign in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const [showPw, setShowPw] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const shake = useAnimationControls();

  const { register, handleSubmit, watch, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: "onTouched" });
  const email = watch("email") ?? "";
  const password = watch("password") ?? "";
  const glow = /\S+@\S+\.\S+/.test(email) && password.length > 0;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user } = await login(values).unwrap();
      setCelebrate((c) => c + 1);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      window.setTimeout(() => navigate(safeNext(params.get("next")) ?? (user.role === "admin" ? "/admin" : "/me"), { replace: true }), 900);
    } catch (err) {
      void shake.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } });
      toast.error("Couldn't sign in", errorMessage(err));
    }
  });

  return (
    <AuthLayout
      mood={{ glow, shy: pwFocus && !showPw, celebrate }}
      title="Welcome back"
      subtitle="Sign in to track applications and apply in one click."
      footer={
        <>
          New to DigiBizz Jobs?{" "}
          <Link to={`/register${params.size ? `?${params}` : ""}`} className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <motion.form animate={shake} onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" error={formState.errors.email?.message}>
          {(id) => <Input id={id} type="email" autoComplete="email" placeholder="you@example.com" leading={<Envelope className="size-4" />} invalid={!!formState.errors.email} {...register("email")} autoFocus />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          {(id) => {
            const reg = register("password");
            return (
              <Input
                id={id}
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                leading={<LockKey className="size-4" />}
                invalid={!!formState.errors.password}
                {...reg}
                onFocus={() => setPwFocus(true)}
                onBlur={(e) => {
                  setPwFocus(false);
                  void reg.onBlur(e);
                }}
                trailing={
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
            );
          }}
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={isLoading} chip={<ArrowRight weight="bold" className="size-4" />}>
          Sign in
        </Button>
      </motion.form>
    </AuthLayout>
  );
}
