import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { Broadcast, Check, Copy, Key, Plus, Prohibit, WarningCircle, WifiHigh } from "@phosphor-icons/react";
import { apiKeyCreateSchema, formatDate, PARTNER_SCOPES, type ApiKeyCreateInput, type ApiKeyDTO, type PartnerScope } from "@digibizz/jobs-shared";
import { useApiKeysQuery, useApiKeyUsageQuery, useCreateApiKeyMutation, useRevokeApiKeyMutation } from "@/store/api";
import { useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { CountUp, FlowChart } from "@/components/motion";
import { Badge, Button, ButtonLink, ConfirmDialog, EmptyState, Field, Input, Modal, Skeleton } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { panelIntro } from "@/lib/motion";

function KeyCard({ k, i, onRevoke }: { k: ApiKeyDTO; i: number; onRevoke: () => void }) {
  const { data: usage } = useApiKeyUsageQuery(k.id);
  const revoked = !!k.revokedAt;
  return (
    <motion.div custom={i} variants={panelIntro} initial="hidden" animate="show" className={cn("panel overflow-hidden", revoked && "opacity-60")}>
      <div className="grid gap-0 md:grid-cols-[300px_1fr]">
        <div className="p-4">
          <motion.div
            whileHover={{ rotateX: 6, rotateY: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            style={{ transformPerspective: 700 }}
            className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1d2023,#0a0b0c)] p-5 text-white shadow-xl"
          >
            <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[radial-gradient(circle,rgba(179,92,240,0.45),transparent_70%)]" />
            <span aria-hidden className={cn("absolute bottom-0 right-0 h-16 w-28 rounded-tl-[60px] opacity-80", revoked ? "bg-white/10" : "bg-gradient-to-br from-[#b35cf0] to-[#2fd08a]")} />
            <div className="relative flex items-start justify-between">
              <WifiHigh className="size-5 rotate-90 text-white/70" />
              <span className="font-mono text-sm tracking-widest">{k.prefix}••••</span>
            </div>
            <div className="relative">
              <Broadcast className="mb-2 size-6 text-white/80" />
              <p className="text-[10.5px] uppercase tracking-wider text-white/50">{k.partnerSlug}</p>
              <p className="font-medium">{k.name}</p>
            </div>
          </motion.div>
        </div>
        <div className="flex flex-col gap-4 border-t border-line p-5 md:border-l md:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {revoked ? <Badge tone="danger">Revoked {formatDate(k.revokedAt!)}</Badge> : <Badge tone="brand" dot>Active</Badge>}
              {k.scopes.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            {!revoked && (
              <Button size="sm" variant="ghost" className="text-danger" icon={<Prohibit className="size-4" />} onClick={onRevoke}>
                Revoke
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-well p-3">
              <p className="font-display text-xl font-semibold"><CountUp value={k.requestCount} /></p>
              <p className="text-[11px] text-muted">total requests</p>
            </div>
            <div className="rounded-xl bg-well p-3">
              <p className="font-display text-xl font-semibold"><CountUp value={usage?.reduce((a, b) => a + b.count, 0) ?? 0} /></p>
              <p className="text-[11px] text-muted">last 30 days</p>
            </div>
            <div className="rounded-xl bg-well p-3">
              <p className="text-sm font-semibold">{k.lastUsedAt ? formatDate(k.lastUsedAt) : "Never"}</p>
              <p className="text-[11px] text-muted">last used</p>
            </div>
          </div>
          {usage ? (
            <FlowChart height={90} labels={usage.map((u) => u.day)} series={[{ name: "Requests", color: "var(--violet)", values: usage.map((u) => u.count) }]} />
          ) : (
            <Skeleton className="h-[90px]" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CreateKey({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [create, { isLoading }] = useCreateApiKeyMutation();
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const { register, handleSubmit, formState, reset, watch, setValue } = useForm<ApiKeyCreateInput>({
    resolver: zodResolver(apiKeyCreateSchema),
    defaultValues: { name: "IndusTech Connect", partnerSlug: "industechconnect", scopes: [...PARTNER_SCOPES] },
  });
  const scopes = (watch("scopes") ?? []) as PartnerScope[];
  const close = () => {
    onClose();
    window.setTimeout(() => {
      setSecret(null);
      setCopied(false);
      reset();
    }, 300);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={secret ? "Copy your API key" : "New partner API key"}
      description={secret ? undefined : "Give it to the partner's developers over a secure channel."}
      footer={
        secret ? (
          <Button variant="primary" onClick={close}>
            I've copied it
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isLoading}
              onClick={handleSubmit(async (v) => {
                try {
                  const res = await create(v).unwrap();
                  setSecret(res.secret);
                } catch (err) {
                  toast.error("Couldn't create key", errorMessage(err));
                }
              })}
            >
              Create key
            </Button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait">
        {secret ? (
          <motion.div key="secret" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
              <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" />
              This is the only time the full key is shown. It is stored as a one-way hash.
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-night p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-sm text-[#8be9b8]">{secret}</code>
              <Button
                size="sm"
                variant={copied ? "primary" : "secondary"}
                icon={copied ? <Check weight="bold" className="size-4" /> : <Copy className="size-4" />}
                onClick={async () => {
                  await navigator.clipboard.writeText(secret).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0, scale: 0.95 }} className="grid gap-4">
            <Field label="Name" error={formState.errors.name?.message}>
              {(id) => <Input id={id} {...register("name")} />}
            </Field>
            <Field label="Partner slug" hint="added to apply links as ?ref=" error={formState.errors.partnerSlug?.message}>
              {(id) => <Input id={id} {...register("partnerSlug")} className="font-mono" />}
            </Field>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Collections</p>
              <div className="flex flex-wrap gap-2">
                {PARTNER_SCOPES.map((s) => {
                  const on = scopes.includes(s);
                  return (
                    <motion.button
                      key={s}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setValue("scopes", on ? scopes.filter((x) => x !== s) : [...scopes, s])}
                      className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors", on ? "border-brand/50 bg-brand-soft text-brand" : "border-line text-muted")}
                    >
                      {on && <Check weight="bold" className="size-3.5" />}
                      {s}
                    </motion.button>
                  );
                })}
              </div>
              {formState.errors.scopes && <p className="mt-1.5 text-[12.5px] text-danger">Pick at least one collection</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

export default function ApiKeys() {
  const { data, isLoading } = useApiKeysQuery();
  const [open, setOpen] = useState(false);
  const [toRevoke, setToRevoke] = useState<ApiKeyDTO | null>(null);
  const [revoke, { isLoading: revoking }] = useRevokeApiKeyMutation();
  const toast = useToast();

  useShellHeader({
    title: "Partner API",
    subtitle: "Keys for IndusTech Connect and other partner portals",
    actions: (
      <>
        <a href="/api/partner/v1/openapi.json" target="_blank" rel="noreferrer" className="hidden h-10 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium hover:border-line-strong md:inline-flex">
          API spec
        </a>
        <Button variant="primary" onClick={() => setOpen(true)} chip={<Plus weight="bold" className="size-3.5" />}>
          New key
        </Button>
      </>
    ),
  });

  return (
    <div className="space-y-4 px-4 py-6 sm:px-6">
      {isLoading ? (
        <Skeleton className="h-56" />
      ) : data?.length ? (
        data.map((k, i) => <KeyCard key={k.id} k={k} i={i} onRevoke={() => setToRevoke(k)} />)
      ) : (
        <EmptyState icon={<Key className="size-7" />} title="No API keys yet" body="Create a key for IndusTech Connect to start syncing jobs, internships, programs and trainings." action={<Button variant="primary" onClick={() => setOpen(true)}>Create key</Button>} />
      )}
      <CreateKey open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        title="Revoke this key?"
        body={toRevoke ? `${toRevoke.name} will immediately lose access to the partner API. This can't be undone.` : undefined}
        confirmLabel="Revoke"
        danger
        loading={revoking}
        onConfirm={async () => {
          if (!toRevoke) return;
          try {
            await revoke(toRevoke.id).unwrap();
            toast.success("Key revoked");
          } catch (err) {
            toast.error("Couldn't revoke", errorMessage(err));
          }
          setToRevoke(null);
        }}
      />
    </div>
  );
}
