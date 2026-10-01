import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { CheckCircle, Envelope, Eye, EyeSlash, LockKey, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { changePasswordSchema, formatDate, passwordSchema } from "@digibizz/jobs-shared";
import { z } from "zod";
import { useChangePasswordMutation } from "@/store/api";
import { useAuth, useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Avatar, Button, Field, Input, PanelHeader } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { panelIntro } from "@/lib/motion";

const formSchema = changePasswordSchema
  .extend({ confirm: z.string(), newPassword: passwordSchema })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a password you haven't used here before" });

export default function Settings() {
  useShellHeader({ title: "Settings", subtitle: "Your admin account" });
  const { user } = useAuth();
  const [change, { isLoading }] = useChangePasswordMutation();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState, reset, setError } = useForm<z.input<typeof formSchema>>({ resolver: zodResolver(formSchema), mode: "onTouched" });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change({ currentPassword, newPassword }).unwrap();
      reset();
      setDone(true);
      toast.success("Password changed", "A confirmation email has been sent.");
      window.setTimeout(() => setDone(false), 6000);
    } catch (err) {
      for (const [k, v] of Object.entries(fieldErrors(err))) setError(k as "currentPassword" | "newPassword", { message: v });
      toast.error("Couldn't change your password", errorMessage(err));
    }
  });

  if (!user) return null;
  const eye = (
    <button type="button" onClick={() => setShow((v) => !v)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label={show ? "Hide passwords" : "Show passwords"}>
      {show ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
    </button>
  );

  return (
    <div className="grid gap-5 px-4 py-6 sm:px-6 xl:grid-cols-[1fr_360px]">
      <motion.form custom={0} variants={panelIntro} initial="hidden" animate="show" onSubmit={onSubmit} className="panel space-y-5 p-5 sm:p-6" noValidate>
        <PanelHeader title="Change password" subtitle="Use at least 8 characters, including a number." />

        <Field label="Current password" error={formState.errors.currentPassword?.message}>
          {(id) => (
            <Input
              id={id}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              leading={<LockKey className="size-4" />}
              invalid={!!formState.errors.currentPassword}
              trailing={eye}
              {...register("currentPassword")}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" error={formState.errors.newPassword?.message}>
            {(id) => <Input id={id} type={show ? "text" : "password"} autoComplete="new-password" leading={<LockKey className="size-4" />} invalid={!!formState.errors.newPassword} {...register("newPassword")} />}
          </Field>
          <Field label="Confirm new password" error={formState.errors.confirm?.message}>
            {(id) => <Input id={id} type={show ? "text" : "password"} autoComplete="new-password" leading={<LockKey className="size-4" />} invalid={!!formState.errors.confirm} {...register("confirm")} />}
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <motion.p
            initial={false}
            animate={{ opacity: done ? 1 : 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-medium text-brand", !done && "pointer-events-none")}
          >
            <CheckCircle weight="fill" className="size-4" /> Password updated
          </motion.p>
          <Button type="submit" variant="primary" loading={isLoading} icon={<ShieldCheck className="size-4" />}>
            Change password
          </Button>
        </div>
      </motion.form>

      <motion.div custom={1} variants={panelIntro} initial="hidden" animate="show" className="space-y-5">
        <div className="panel p-5">
          <PanelHeader title="Account" />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={user.name} size={48} className="rounded-2xl" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                <Envelope className="size-3.5" /> {user.email}
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Role</dt>
              <dd className="font-medium">Administrator</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Account created</dt>
              <dd className="font-medium">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel flex gap-3 p-5">
          <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-warn" />
          <p className="text-[13px] leading-relaxed text-muted">
            The admin password is set from the server's <code className="rounded bg-well px-1 font-mono text-[12px] text-ink-soft">ADMIN_PASSWORD</code> only when the account is first created. Change it here instead — this takes effect immediately.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
