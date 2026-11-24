import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Megaphone, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import {
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_TYPE_LABEL,
  type AnnouncementDTO,
  type AnnouncementInput,
  type AnnouncementType,
} from "@digibizz/jobs-shared";
import {
  useAdminAnnouncementsQuery,
  useDeleteAnnouncementMutation,
  useSaveAnnouncementMutation,
  useSetAnnouncementActiveMutation,
} from "@/store/api";
import { useToast } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { ANNOUNCEMENT_STYLE, AnnouncementBanner } from "@/components/announcements/AnnouncementBar";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Skeleton, Switch, Textarea } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { cn } from "@/lib/cn";

const MESSAGE_MAX = 400;

type Form = {
  type: AnnouncementType;
  title: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
  active: boolean;
  dismissible: boolean;
  startsAt: string; // datetime-local value, in the admin's own time zone
  endsAt: string;
};

const EMPTY: Form = { type: "announcement", title: "", message: "", linkUrl: "", linkLabel: "", active: true, dismissible: false, startsAt: "", endsAt: "" };

/** ISO -> "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function statusOf(a: AnnouncementDTO): { label: string; tone: "brand" | "info" | "neutral" | "warn" } {
  if (a.live) return { label: "Live", tone: "brand" };
  if (!a.active) return { label: "Off", tone: "neutral" };
  if (a.startsAt && new Date(a.startsAt) > new Date()) return { label: "Scheduled", tone: "info" };
  return { label: "Ended", tone: "warn" };
}

function Editor({ open, editing, onClose }: { open: boolean; editing: AnnouncementDTO | null; onClose: () => void }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, { isLoading }] = useSaveAnnouncementMutation();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? {
            type: editing.type,
            title: editing.title,
            message: editing.message,
            linkUrl: editing.linkUrl,
            linkLabel: editing.linkLabel,
            active: editing.active,
            dismissible: editing.dismissible,
            startsAt: toLocalInput(editing.startsAt),
            endsAt: toLocalInput(editing.endsAt),
          }
        : EMPTY,
    );
  }, [open, editing]);

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  const submit = async () => {
    const body: AnnouncementInput = { ...form, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) };
    try {
      await save({ id: editing?.id, body }).unwrap();
      toast.success(editing ? "Announcement updated" : "Announcement published", form.active ? "It's on the site now (if inside its schedule)." : "Saved as off.");
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error("Couldn't save", errorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? "Edit announcement" : "New announcement"}
      description="Shown in a banner at the top of every page, for every visitor."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={isLoading} onClick={submit} disabled={form.message.trim().length < 3}>
            {editing ? "Save changes" : form.active ? "Publish" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Preview</p>
          <div className="overflow-hidden rounded-xl border border-line">
            <AnnouncementBanner a={{ ...form, message: form.message || "Your message will appear here." }} onDismiss={() => undefined} className="border-b-0" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ANNOUNCEMENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ type: t })}
                aria-pressed={form.type === t}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm font-medium transition-colors",
                  form.type === t ? "border-brand bg-brand-soft/40" : "border-line hover:border-line-strong",
                )}
              >
                <span className={cn("grid size-7 place-items-center rounded-md", ANNOUNCEMENT_STYLE[t].chip)}>{ANNOUNCEMENT_STYLE[t].icon}</span>
                {ANNOUNCEMENT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <Field label="Heading" hint="optional · shown in bold before the message" error={errors.title}>
          {(id) => <Input id={id} value={form.title} maxLength={80} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Admissions open" />}
        </Field>

        <Field label="Message" hint={`${form.message.length}/${MESSAGE_MAX}`} error={errors.message}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              maxLength={MESSAGE_MAX}
              value={form.message}
              onChange={(e) => patch({ message: e.target.value })}
              placeholder="e.g. Applications for the Winter Internship close on 15 December."
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
          <Field label="Link" hint="optional · https://… or a page like /jobs" error={errors.linkUrl}>
            {(id) => <Input id={id} value={form.linkUrl} onChange={(e) => patch({ linkUrl: e.target.value.trim() })} placeholder="/internships" />}
          </Field>
          <Field label="Link text" error={errors.linkLabel}>
            {(id) => <Input id={id} value={form.linkLabel} maxLength={40} onChange={(e) => patch({ linkLabel: e.target.value })} placeholder="Apply now" disabled={!form.linkUrl} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Show from" hint="optional · blank = now" error={errors.startsAt}>
            {(id) => <Input id={id} type="datetime-local" value={form.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />}
          </Field>
          <Field label="Hide after" hint="optional · blank = until switched off" error={errors.endsAt}>
            {(id) => <Input id={id} type="datetime-local" value={form.endsAt} min={form.startsAt || undefined} onChange={(e) => patch({ endsAt: e.target.value })} />}
          </Field>
        </div>

        <div className="space-y-4 rounded-2xl border border-line p-4">
          <Switch checked={form.active} onChange={(v) => patch({ active: v })} label="Switched on" description="Turn off to hide it without deleting." />
          <Switch
            checked={form.dismissible}
            onChange={(v) => patch({ dismissible: v })}
            label="Visitors can close it"
            description="Off = always visible. On = a ✕ hides it for that visitor until you edit it."
          />
        </div>
      </div>
    </Modal>
  );
}

export default function Announcements() {
  const { data, isLoading } = useAdminAnnouncementsQuery();
  const [setActive] = useSetAnnouncementActiveMutation();
  const [remove, { isLoading: removing }] = useDeleteAnnouncementMutation();
  const toast = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementDTO | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementDTO | null>(null);
  const liveCount = data?.filter((a) => a.live).length ?? 0;

  const openEditor = (a: AnnouncementDTO | null) => {
    setEditing(a);
    setEditorOpen(true);
  };

  useShellHeader(
    {
      title: "Announcements",
      subtitle: data ? `${liveCount} live on the site` : "Site-wide banners",
      actions: (
        <Button variant="primary" size="sm" icon={<Plus weight="bold" className="size-4" />} onClick={() => openEditor(null)}>
          New
        </Button>
      ),
    },
    [liveCount, data?.length],
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel p-4 sm:p-5">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : data?.length ? (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {data.map((a) => {
                const st = statusOf(a);
                return (
                  <motion.li key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="overflow-hidden rounded-2xl border border-line">
                    <AnnouncementBanner a={{ ...a, dismissible: false }} className={cn("border-b", !a.live && "opacity-60")} />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                      <Badge tone={st.tone} dot>
                        {st.label}
                      </Badge>
                      <span className="text-muted">{ANNOUNCEMENT_TYPE_LABEL[a.type]}</span>
                      <span className="text-xs text-muted">
                        {a.startsAt || a.endsAt ? `${a.startsAt ? fmt(a.startsAt) : "Now"} → ${a.endsAt ? fmt(a.endsAt) : "no end"}` : "No schedule"}
                        {a.dismissible && " · closable"}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Switch
                          checked={a.active}
                          onChange={async (v) => {
                            try {
                              await setActive({ id: a.id, active: v }).unwrap();
                              toast.success(v ? "Switched on" : "Switched off");
                            } catch (err) {
                              toast.error("Couldn't update", errorMessage(err));
                            }
                          }}
                        />
                        <Button size="sm" variant="ghost" icon={<PencilSimple className="size-4" />} onClick={() => openEditor(a)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Trash className="size-4 text-danger" />} onClick={() => setDeleting(a)} aria-label="Delete" />
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        ) : (
          <EmptyState
            icon={<Megaphone className="size-7" />}
            title="No announcements yet"
            body="Post a banner that every visitor sees at the top of the site, e.g. admissions opening, a deadline or planned maintenance."
            action={
              <Button variant="primary" icon={<Plus weight="bold" className="size-4" />} onClick={() => openEditor(null)}>
                New announcement
              </Button>
            }
          />
        )}
      </div>
      <Editor open={editorOpen} editing={editing} onClose={() => setEditorOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this announcement?"
        body="It disappears from the site straight away. To hide it temporarily, switch it off instead."
        confirmLabel="Delete"
        danger
        loading={removing}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove(deleting.id).unwrap();
            toast.success("Announcement deleted");
            setDeleting(null);
          } catch (err) {
            toast.error("Couldn't delete", errorMessage(err));
          }
        }}
      />
    </div>
  );
}
