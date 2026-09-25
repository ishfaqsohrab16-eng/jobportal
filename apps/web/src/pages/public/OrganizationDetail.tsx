import { useParams } from "react-router";
import { motion } from "motion/react";
import { Buildings, Globe, MapPin, SealCheck } from "@phosphor-icons/react";
import { useOrganizationQuery } from "@/store/api";
import { useShellHeader } from "@/components/layout/ShellContext";
import { CountUp, Stagger } from "@/components/motion";
import { CategoryBadge, OpportunityCard } from "@/components/opportunity";
import { Avatar, ButtonLink, EmptyState, Skeleton } from "@/components/ui";
import { ease } from "@/lib/motion";

export default function OrganizationDetail() {
  const { slug = "" } = useParams();
  const { data, isLoading } = useOrganizationQuery(slug);
  const org = data?.organization;
  useShellHeader({ title: org?.name ?? "Organization", subtitle: org ? "Organization profile" : undefined }, [org?.id]);

  if (isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-48" /><Skeleton className="h-72" /></div>;
  if (!org) return <div className="p-6"><EmptyState icon={<Buildings className="size-7" />} title="Organization not found" action={<ButtonLink to="/organizations">All organizations</ButtonLink>} /></div>;

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="panel glow-corner overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            <Avatar name={org.name} src={org.logoUrl} size={88} className="rounded-3xl" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <CategoryBadge category={org.category} />
            <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight">
              {org.name}
              {org.verified && <SealCheck weight="fill" className="size-6 text-brand" />}
            </h1>
            <p className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="size-4" /> {[org.city, org.country].filter(Boolean).join(", ")}
              </span>
              {org.website && (
                <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand">
                  <Globe className="size-4" /> {org.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-well px-6 py-4 text-center">
            <p className="font-display text-4xl font-bold text-brand">
              <CountUp value={data.opportunities.length} />
            </p>
            <p className="text-xs uppercase tracking-wider text-muted">open now</p>
          </div>
        </div>
        {org.about && <p className="prose-plain mt-6 max-w-3xl">{org.about}</p>}
      </motion.section>

      <h2 className="mb-4 mt-8 text-xl font-semibold">Open opportunities</h2>
      {data.opportunities.length ? (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.opportunities.map((o, i) => (
            <OpportunityCard key={o.id} o={o} index={i} />
          ))}
        </Stagger>
      ) : (
        <EmptyState title="Nothing open right now" body="Follow this page — new opportunities appear here as soon as they're published." />
      )}
    </div>
  );
}
