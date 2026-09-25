import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { Buildings, Camera, PencilSimple, Plus, SealCheck, Trash } from "@phosphor-icons/react";
import { CATEGORIES, CATEGORY_LABEL, organizationSchema, type OrganizationDTO, type OrganizationInput } from "@digibizz/jobs-shared";
import { useAdminOrganizationsQuery, useDeleteOrganizationMutation, useSaveOrganizationMutation, useUploadLogoMutation } from "@/store/api";
import { useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Stagger } from "@/components/motion";
import { CategoryBadge } from "@/components/opportunity";
import { Avatar, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Skeleton, Switch, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { fadeUp } from "@/lib/motion";

function OrgForm({ org, open, onClose }: { org: OrganizationDTO | null; open: boolean; onClose: () => void }) {
  const [save, { isLoading }] = useSaveOrganizationMutation();
  const toast = useToast();
  const { register, handleSubmit, reset, formState, watch, setValue } = useForm<OrganizationInput>({ resolver: zodResolver(organizationSchema) });
  useEffect(() => {
    if (open)
      reset(
        org
          ? { name: org.name, category: org.category, website: org.website, city: org.city, country: org.country, about: org.about, verified: org.verified }
          : { name: "", category: "private", website: "", city: "", country: "Pakistan", about: "", verified: false },
      );
  }, [open, org, reset]);
  const e = formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={org ? "Edit organization" : "New organization"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isLoading}
            onClick={handleSubmit(async (body) => {
              try {
                await save({ id: org?.id, body }).unwrap();
                toast.success(org ? "Organization updated" : "Organization created");
                onClose();
              } catch (err) {
                toast.error("Couldn't save", errorMessage(err));
              }
            })}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2" error={e.name?.message}>
          {(id) => <Input id={id} {...register("name")} invalid={!!e.name} autoFocus />}
        </Field>
        <Field label="Category">
          {(id) => (
            <Select id={id} {...register("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Website" error={e.website?.message}>
          {(id) => <Input id={id} {...register("website")} placeholder="https://…" />}
        </Field>
        <Field label="City">
          {(id) => <Input id={id} {...register("city")} />}
        </Field>
        <Field label="Country">
          {(id) => <Input id={id} {...register("country")} />}
        </Field>
        <Field label="About" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={4} {...register("about")} />}
        </Field>
        <div className="sm:col-span-2">
          <Switch checked={!!watch("verified")} onChange={(v) => setValue("verified", v, { shouldDirty: true })} label="Verified organization" description="Shows a verified badge next to the name" />
        </div>
      </div>
    </Modal>
  );
}

function LogoUpload({ org }: { org: OrganizationDTO }) {
  const input = useRef<HTMLInputElement>(null);
  const [upload, { isLoading }] = useUploadLogoMutation();
  const toast = useToast();
  return (
    <>
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => input.current?.click()} className="group relative" aria-label="Change logo">
        <Avatar name={org.name} src={org.logoUrl} size={56} className="rounded-2xl" />
        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isLoading ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera className="size-5" />}
        </span>
      </motion.button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            await upload({ id: org.id, file }).unwrap();
            toast.success("Logo updated");
          } catch (err) {
            toast.error("Upload failed", errorMessage(err));
          }
          e.target.value = "";
        }}
      />
    </>
  );
}

export default function Organizations() {
  const { data, isLoading } = useAdminOrganizationsQuery();
  const [editing, setEditing] = useState<OrganizationDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<OrganizationDTO | null>(null);
  const [del, { isLoading: deleting }] = useDeleteOrganizationMutation();
  const toast = useToast();
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  useShellHeader({
    title: "Organizations",
    subtitle: data ? `${data.length} organizations` : "Employers & training providers",
    actions: (
      <Button variant="primary" onClick={openNew} chip={<Plus weight="bold" className="size-3.5" />}>
        Add
      </Button>
    ),
  }, [data?.length]);

  return (
    <div className="px-4 py-6 sm:px-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : data?.length ? (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" gap={0.05}>
          <AnimatePresence>
            {data.map((o) => (
              <motion.div key={o.id} variants={fadeUp} layout exit={{ opacity: 0, scale: 0.9 }} className="panel flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <LogoUpload org={o} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{o.name}</span>
                      {o.verified && <SealCheck weight="fill" className="size-4 shrink-0 text-brand" />}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">{[o.city, o.country].filter(Boolean).join(", ")}</p>
                    <div className="mt-2">
                      <CategoryBadge category={o.category} />
                    </div>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-ink-soft">{o.about || "No description."}</p>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  <span className="text-sm">
                    <b className="text-brand">{o.openCount ?? 0}</b> <span className="text-muted">open</span>
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<PencilSimple className="size-4" />}
                      onClick={() => {
                        setEditing(o);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(o)} aria-label="Delete">
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Stagger>
      ) : (
        <EmptyState icon={<Buildings className="size-7" />} title="No organizations yet" body="Add the employers and training providers you publish for." action={<Button variant="primary" onClick={openNew}>Add organization</Button>} />
      )}

      <OrgForm org={editing} open={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete organization?"
        body="Organizations that still have opportunities can't be deleted."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del(toDelete.id).unwrap();
            toast.success("Deleted");
          } catch (err) {
            toast.error("Couldn't delete", errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}
