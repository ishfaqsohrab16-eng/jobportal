import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CloudArrowUp, FilePdf, Trash, DownloadSimple } from "@phosphor-icons/react";
import { RESUME_MAX_BYTES, formatDate, type UserDTO } from "@digibizz/jobs-shared";
import { useDeleteResumeMutation, useUploadResumeMutation } from "@/store/api";
import { useToast } from "@/hooks";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { Button, Spinner } from "@/components/ui";

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function ResumeDropzone({ user }: { user: UserDTO }) {
  const [upload, { isLoading }] = useUploadResumeMutation();
  const [remove, { isLoading: removing }] = useDeleteResumeMutation();
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const send = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > RESUME_MAX_BYTES) {
      toast.error("File is too large", "Resumes can be up to 5 MB.");
      return;
    }
    // fetch() has no upload progress; animate an optimistic bar while the request runs.
    setProgress(12);
    const tick = window.setInterval(() => setProgress((p) => Math.min(90, p + 9)), 120);
    try {
      await upload(file).unwrap();
      setProgress(100);
      toast.success("Resume uploaded", file.name);
    } catch (err) {
      toast.error("Upload failed", errorMessage(err));
    } finally {
      window.clearInterval(tick);
      window.setTimeout(() => setProgress(0), 600);
    }
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {user.resume && (
          <motion.div
            key={user.resume.uploadedAt}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 p-3.5"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-danger-soft text-danger">
              <FilePdf weight="fill" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.resume.fileName}</p>
              <p className="text-xs text-muted">
                {(user.resume.size / 1024).toFixed(0)} KB · uploaded {formatDate(user.resume.uploadedAt)}
              </p>
            </div>
            <a href="/api/me/resume" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label="Download resume">
              <DownloadSimple className="size-4.5" />
            </a>
            <Button variant="ghost" size="sm" className="!px-2" loading={removing} onClick={() => remove()} aria-label="Remove resume">
              <Trash className="size-4.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void send(e.dataTransfer.files[0]);
        }}
        animate={{ scale: drag ? 1.02 : 1 }}
        className={cn(
          "relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          drag ? "border-brand bg-brand-soft/40" : "border-line-strong bg-well/50 hover:border-brand/60",
        )}
      >
        <motion.span animate={{ y: drag ? -6 : [0, -4, 0] }} transition={drag ? { type: "spring" } : { duration: 2.4, repeat: Infinity }} className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-brand">
          {isLoading ? <Spinner className="size-5" /> : <CloudArrowUp className="size-6" />}
        </motion.span>
        <p className="text-sm font-semibold">{user.resume ? "Replace your resume" : "Upload your resume"}</p>
        <p className="text-xs text-muted">Drag & drop or click · PDF, DOC or DOCX · up to 5 MB</p>
        {progress > 0 && (
          <motion.span className="absolute inset-x-0 bottom-0 h-1 origin-left bg-brand" initial={{ scaleX: 0 }} animate={{ scaleX: progress / 100 }} transition={{ ease: "easeOut" }} />
        )}
      </motion.button>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void send(e.target.files?.[0] ?? undefined)} />
    </div>
  );
}
