import { useState } from "react";
import { motion } from "motion/react";
import { FilePdf, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { formatDate } from "@digibizz/jobs-shared";
import { useCandidatesQuery } from "@/store/api";
import { useDebouncedValue } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Avatar, Badge, EmptyState, Input, Pagination, Skeleton } from "@/components/ui";

export default function Candidates() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search, 300);
  const { data, isLoading, isFetching } = useCandidatesQuery({ q, page, limit: 20 });
  useShellHeader({ title: "Candidates", subtitle: data ? `${data.total} registered` : "Registered job seekers" }, [data?.total]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel p-4 sm:p-5">
        <div className="mb-4">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, skill or city"
            leading={<MagnifyingGlass className="size-4" />}
            className="h-10"
          />
        </div>
        <div className="hidden grid-cols-[1.6fr_1.6fr_0.8fr_0.7fr_0.8fr] gap-4 rounded-xl bg-well px-4 py-3 text-xs font-medium text-muted lg:grid">
          <span>Candidate</span>
          <span>Skills</span>
          <span>City</span>
          <span>Resume</span>
          <span>Joined</span>
        </div>
        {isLoading ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data?.items.length ? (
          <motion.ul animate={{ opacity: isFetching ? 0.6 : 1 }} className="divide-y divide-line">
            {data.items.map((u, i) => (
              <motion.li key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="grid grid-cols-1 gap-2 px-2 py-3.5 text-sm lg:grid-cols-[1.6fr_1.6fr_0.8fr_0.7fr_0.8fr] lg:items-center lg:gap-4 lg:px-4">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={u.name} size={34} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="block truncate text-xs text-muted">{u.email}</span>
                  </span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {u.skills.slice(0, 4).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                  {u.skills.length > 4 && <Badge>+{u.skills.length - 4}</Badge>}
                </span>
                <span className="text-ink-soft">{u.city || "—"}</span>
                <span>{u.resume ? <FilePdf weight="fill" className="size-5 text-danger" /> : <span className="text-muted">—</span>}</span>
                <span className="text-muted">{formatDate(u.createdAt)}</span>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <EmptyState className="mt-4" icon={<UsersThree className="size-7" />} title="No candidates found" />
        )}
        <div className="mt-5">
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
