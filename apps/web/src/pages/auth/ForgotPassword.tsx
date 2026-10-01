import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Envelope, PaperPlaneTilt } from "@phosphor-icons/react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@digibizz/jobs-shared";
import { useForgotPasswordMutation } from "@/store/api";
import { useDocumentTitle, useToast } from "@/hooks";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";

export default function ForgotPassword() {
  useDocumentTitle("Forgot password");
  const [send, { isLoading }] = useForgotPasswordMutation();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const toast = useToast();
  const { register, handleSubmit, watch, formState } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), mode: "onTouched" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await send(values).unwrap();
      setSentTo(values.email);
    } catch (err) {
      toast.error("Couldn't send the email", errorMessage(err));
    }
  });

  return (
    <AuthLayout
      mood={{ glow: /\S+@\S+\.\S+/.test(watch("email") ?? ""), shy: false, celebrate: sentTo ? 1 : 0 }}
      title={sentTo ? "Check your email" : "Forgot your password?"}
      subtitle={
        sentTo
          ? "If that address has an account, a reset link is on its way."
          : "Enter the email you signed up with and we'll send you a link to set a new password."
      }
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      }
    >
      {sentTo ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/50 p-4">
            <PaperPlaneTilt weight="fill" className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="text-sm">
              <p className="font-semibold text-ink">Sent to {sentTo}</p>
              <p className="mt-1 text-muted">The link works once and expires in about an hour. Check your spam folder if it hasn't arrived in a few minutes.</p>
            </div>
          </div>
          <Button variant="secondary" block onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" error={formState.errors.email?.message}>
            {(id) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                leading={<Envelope className="size-4" />}
                invalid={!!formState.errors.email}
                autoFocus
                {...register("email")}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" block loading={isLoading} chip={<ArrowRight weight="bold" className="size-4" />}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
