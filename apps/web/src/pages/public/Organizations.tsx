import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Buildings, MagnifyingGlass, MapPin, SealCheck } from "@phosphor-icons/react";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@digibizz/jobs-shared";
import { useOrganizationsQuery } from "@/store/api";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Stagger } from "@/components/motion";
import { CategoryBadge } from "@/components/opportunity";
import { Avatar, EmptyState, Input, Segmented, Skeleton } from "@/components/ui";
import { fadeUp } from "@/lib/motion";

export default function Organizations() {
  useShellHeader({ title: "Organizations", subtitle: "Government, international and private organizations hiring through DigiBizz" });
  const { data, isLoading } = useOrganizationsQuery();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const list = useMemo(
    () => (data ?? []).filter((o) => (cat === "all" || o.category === cat) && o.name.toLowerCase().includes(q.toLowerCase())),
    [data, q, cat],
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel mb-5 flex flex-wrap items-center gap-2 p-2">
        <div className="min-w-0 flex-1 basis-60">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search organizations" leading={<MagnifyingGlass className="size-4" />} className="h-10 border-transparent" />
        </div>
        <Segmented
          value={cat}
          onChange={setCat}
          size="sm"
          options={[{ value: "all" as const, label: "All" }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]}
        />
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : list.length ? (
        <Stagger key={cat + q} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" gap={0.05}>
          {list.map((o) => (
            <motion.div key={o.id} variants={fadeUp} whileHover={{ y: -4 }}>
              <Link to={`/organizations/${o.slug}`} className="panel group flex h-full flex-col gap-4 p-5 transition-colors hover:border-line-strong">
                <div className="flex items-start gap-3">
                  <Avatar name={o.name} src={o.logoUrl} size={52} className="rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{o.name}</span>
                      {o.verified && <SealCheck weight="fill" className="size-4 shrink-0 text-brand" />}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                      <MapPin className="size-3.5" /> {[o.city, o.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <ArrowUpRight className="size-5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="line-clamp-2 text-sm text-ink-soft">{o.about || "No description yet."}</p>
                <div className="mt-auto flex items-center justify-between">
                  <CategoryBadge category={o.category} />
                  <span className="text-sm font-medium">
                    <span className="text-brand">{o.openCount ?? 0}</span> <span className="text-muted">open</span>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      ) : (
        <EmptyState icon={<Buildings className="size-7" />} title="No organizations found" />
      )}
    </div>
  );
}
