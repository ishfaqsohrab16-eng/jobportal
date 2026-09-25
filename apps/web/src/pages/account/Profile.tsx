import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { FloppyDisk, LockKey } from "@phosphor-icons/react";
import { CITIES, passwordSchema, profileSchema, type ProfileInput } from "@digibizz/jobs-shared";
import { z } from "zod";
import { useChangePasswordMutation, useUpdateProfileMutation } from "@/store/api";
import { useAuth, useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { ResumeDropzone } from "@/components/ResumeDropzone";
import { Avatar, Button, Field, Input, PanelHeader, Select, TagInput, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { panelIntro } from "@/lib/motion";

const pwForm = z
  .object({ currentPassword: z.string().min(1, "Required"), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

function PasswordCard() {
  const [change, { isLoading }] = useChangePasswordMutation();
  const toast = useToast();
  const { register, handleSubmit, formState, reset } = useForm<z.input<typeof pwForm>>({ resolver: zodResolver(pwForm) });
  return (
    <form
      onSubmit={handleSubmit(async ({ currentPassword, newPassword }) => {
        try {
          await change({ currentPassword, newPassword }).unwrap();
          toast.success("Password changed");
          reset();
        } catch (err) {
          toast.error("Couldn't change password", errorMessage(err));
        }
      })}
      className="panel space-y-4 p-5"
    >
      <PanelHeader title="Password" subtitle="Use at least 8 characters with a number" />
      <Field label="Current password" error={formState.errors.currentPassword?.message}>
        {(id) => <Input id={id} type="password" autoComplete="current-password" {...register("currentPassword")} />}
      </Field>
      <Field label="New password" error={formState.errors.newPassword?.message}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" {...register("newPassword")} />}
      </Field>
      <Field label="Confirm new password" error={formState.errors.confirm?.message}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" {...register("confirm")} />}
      </Field>
      <Button type="submit" loading={isLoading} icon={<LockKey className="size-4" />}>
        Update password
      </Button>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  useShellHeader({ title: "Profile", subtitle: "What organizations see when you apply" });
  const [save, { isLoading }] = useUpdateProfileMutation();
  const toast = useToast();
  const { register, handleSubmit, control, reset, formState } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user)
      reset({
        name: user.name,
        phone: user.phone,
        city: user.city,
        headline: user.headline,
        education: user.education,
        experienceYears: user.experienceYears,
        skills: user.skills,
        about: user.about,
        linkedinUrl: user.linkedinUrl,
      });
  }, [user, reset]);

  if (!user) return null;

  return (
    <div className="grid gap-5 px-4 py-6 sm:px-6 xl:grid-cols-[1fr_380px]">
      <motion.form
        custom={0}
        variants={panelIntro}
        initial="hidden"
        animate="show"
        onSubmit={handleSubmit(async (values) => {
          try {
            await save(values).unwrap();
            toast.success("Profile saved");
          } catch (err) {
            toast.error("Couldn't save", errorMessage(err));
          }
        })}
        className="panel space-y-5 p-5 sm:p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={64} className="rounded-2xl" />
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={formState.errors.name?.message}>
            {(id) => <Input id={id} {...register("name")} />}
          </Field>
          <Field label="Phone" error={formState.errors.phone?.message}>
            {(id) => <Input id={id} {...register("phone")} placeholder="03xx xxxxxxx" />}
          </Field>
          <Field label="Headline" className="sm:col-span-2" hint="e.g. Junior React developer">
            {(id) => <Input id={id} {...register("headline")} />}
          </Field>
          <Field label="City">
            {(id) => (
              <Select id={id} {...register("city")}>
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Years of experience" error={formState.errors.experienceYears?.message}>
            {(id) => <Input id={id} type="number" min={0} max={60} {...register("experienceYears", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />}
          </Field>
          <Field label="Highest education" className="sm:col-span-2" hint="e.g. BS Computer Science, UoB">
            {(id) => <Input id={id} {...register("education")} />}
          </Field>
          <Field label="Skills" className="sm:col-span-2" hint="Press Enter after each">
            {(id) => <Controller control={control} name="skills" render={({ field }) => <TagInput id={id} value={field.value ?? []} onChange={field.onChange} placeholder="React, Figma, SQL…" />} />}
          </Field>
          <Field label="LinkedIn URL" className="sm:col-span-2" error={formState.errors.linkedinUrl?.message}>
            {(id) => <Input id={id} {...register("linkedinUrl")} placeholder="https://linkedin.com/in/…" />}
          </Field>
          <Field label="About you" className="sm:col-span-2">
            {(id) => <Textarea id={id} rows={5} {...register("about")} />}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isLoading} icon={<FloppyDisk className="size-4" />} disabled={!formState.isDirty}>
            Save profile
          </Button>
        </div>
      </motion.form>

      <div className="space-y-5">
        <motion.div custom={1} variants={panelIntro} initial="hidden" animate="show" className="panel p-5">
          <PanelHeader title="Resume" subtitle="Attached to every application you send" />
          <div className="mt-4">
            <ResumeDropzone user={user} />
          </div>
        </motion.div>
        <motion.div custom={2} variants={panelIntro} initial="hidden" animate="show">
          <PasswordCard />
        </motion.div>
      </div>
    </div>
  );
}
