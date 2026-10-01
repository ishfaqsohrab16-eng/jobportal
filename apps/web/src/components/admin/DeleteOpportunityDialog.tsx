import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash, Warning } from "@phosphor-icons/react";
import type { OpportunityDTO } from "@digibizz/jobs-shared";
import { useDeleteOpportunityMutation } from "@/store/api";
import { useToast } from "@/hooks";
import { errorMessage } from "@/lib/errors";
import { Button, Field, Input, Modal } from "@/components/ui";

/**
 * Deleting an opportunity that has applications throws away candidates' work,
 * so it takes two deliberate steps: acknowledge what goes, then retype the
 * title. Opportunities with no applications are a single confirmation.
 */
export function DeleteOpportunityDialog({ opportunity, onClose }: { opportunity: OpportunityDTO | null; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const [del, { isLoading }] = useDeleteOpportunityMutation();
  const toast = useToast();

  const count = opportunity?.applicationsCount ?? 0;
  const hasApplications = count > 0;

  useEffect(() => {
    if (opportunity) {
      setStep(1);
      setTyped("");
    }
  }, [opportunity]);

  const titleMatches = typed.trim() === (opportunity?.title ?? "").trim();

  const run = async () => {
    if (!opportunity) return;
    try {
      const res = await del({
        id: opportunity.id,
        deleteApplications: hasApplications,
        confirmTitle: hasApplications ? typed.trim() : opportunity.title,
      }).unwrap();
      toast.success(
        "Deleted",
        res.deletedApplications
          ? `“${opportunity.title}” and ${res.deletedApplications} application${res.deletedApplications === 1 ? "" : "s"} were removed.`
          : `“${opportunity.title}” was removed.`,
      );
      onClose();
    } catch (err) {
      toast.error("Couldn't delete", errorMessage(err));
    }
  };

  return (
    <Modal
      open={!!opportunity}
      onClose={onClose}
      title={step === 1 ? "Delete opportunity?" : "Last check"}
      description={step === 1 ? "This cannot be undone." : "Type the title exactly to confirm."}
      footer={
        <>
          <Button variant="ghost" onClick={step === 2 ? () => setStep(1) : onClose}>
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          {step === 1 && hasApplications ? (
            <Button variant="danger" onClick={() => setStep(2)} icon={<Warning className="size-4" />}>
              Yes, continue
            </Button>
          ) : (
            <Button variant="danger" loading={isLoading} disabled={hasApplications && !titleMatches} onClick={run} icon={<Trash className="size-4" />}>
              Delete permanently
            </Button>
          )}
        </>
      }
    >
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="s1" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
            <p className="text-sm text-ink-soft">
              <b className="text-ink">“{opportunity?.title}”</b> will be permanently removed from the portal and from the partner feed.
            </p>
            {hasApplications ? (
              <div className="space-y-3 rounded-2xl border border-danger/35 bg-danger-soft/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <Warning weight="fill" className="size-5 shrink-0" />
                  {count} application{count === 1 ? "" : "s"} will be deleted too
                </p>
                <ul className="ml-1 list-disc space-y-1 pl-4 text-[13px] text-ink-soft">
                  <li>Candidates lose this application and its history from their dashboard.</li>
                  <li>Submitted resumes for this opportunity are deleted.</li>
                  <li>Your reporting totals will drop by {count}.</li>
                </ul>
                <p className="text-[13px] text-muted">
                  To keep the applications, cancel and set the status to <b className="text-ink-soft">Closed</b> instead.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">It has no applications, so nothing else is affected.</p>
            )}
          </motion.div>
        ) : (
          <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="space-y-4">
            <p className="text-sm text-ink-soft">
              You are about to delete this opportunity and <b className="text-danger">{count} application{count === 1 ? "" : "s"}</b>. Type the title to confirm:
            </p>
            <p className="select-all rounded-xl border border-line bg-well px-3 py-2 font-mono text-[13px] text-ink">{opportunity?.title}</p>
            <Field label="Title" error={typed && !titleMatches ? "That doesn't match yet" : undefined}>
              {(id) => (
                <Input
                  id={id}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Type the title here"
                  autoFocus
                  autoComplete="off"
                  invalid={!!typed && !titleMatches}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && titleMatches) void run();
                  }}
                />
              )}
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
