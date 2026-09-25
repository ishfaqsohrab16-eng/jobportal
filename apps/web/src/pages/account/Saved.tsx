import { BookmarkSimple } from "@phosphor-icons/react";
import { useSavedQuery } from "@/store/api";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Stagger } from "@/components/motion";
import { OpportunityCard, OpportunityCardSkeleton } from "@/components/opportunity";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function Saved() {
  const { data, isLoading } = useSavedQuery();
  useShellHeader({ title: "Saved", subtitle: data ? `${data.length} saved opportunities, soonest deadline first` : "Your shortlist" });
  return (
    <div className="px-4 py-6 sm:px-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <OpportunityCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.length ? (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((o, i) => (
            <OpportunityCard key={o.id} o={o} index={i} />
          ))}
        </Stagger>
      ) : (
        <EmptyState
          icon={<BookmarkSimple className="size-7" />}
          title="Nothing saved yet"
          body="Tap the bookmark on any opportunity to keep it here."
          action={<ButtonLink to="/jobs" variant="primary">Browse jobs</ButtonLink>}
        />
      )}
    </div>
  );
}
