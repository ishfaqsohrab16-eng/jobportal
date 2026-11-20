import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { DownloadSimple, FileCsv, FilePdf, FileXls, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { formatDate } from "@digibizz/jobs-shared";
import { useApplicationFacetsQuery, useCandidatesQuery } from "@/store/api";
import { useDebouncedValue, useToast, useUrlFilters } from "@/hooks";
import { useShellHeader } from "@/components/layout/ShellContext";
import { Avatar, Badge, Button, EmptyState, Input, Pagination, Select, Skeleton, Spinner } from "@/components/ui";
import { apiUrl, downloadFromApi } from "@/lib/download";
import { errorMessage } from "@/lib/errors";

const KEYS = ["q", "city", "skill", "resume", "minExperience", "page"] as const;

export default function Candidates() {
  const { values, set, clear } = useUrlFilters(KEYS);
  const [search, setSearch] = useState(values.q);
  const [skill, setSkill] = useState(values.skill);
  const q = useDebouncedValue(search, 300);
  const skillQ = useDebouncedValue(skill, 300);
  useEffect(() => {
    if (q !== values.q || skillQ !== values.skill) set({ q, skill: skillQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, skillQ]);
  const page = Number(values.page) || 1;
  const { data, isLoading, isFetching } = useCandidatesQuery({ ...values, page, limit: 20 });
  const { data: facets } = useApplicationFacetsQuery();
  const [busy, setBusy] = useState<"xlsx" | "csv" | null>(null);
  const toast = useToast();
  const filtered = Object.entries(values).some(([k, v]) => k !== "page" && v);

  const exportAs = async (format: "xlsx" | "csv") => {
    setBusy(format);
    try {
      const { page: _p, ...params } = values;
      await downloadFromApi(apiUrl("/admin/candidates/export", { ...params, format }), `candidates.${format}`);
    } catch (err) {
      toast.error("Couldn't download", errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  useShellHeader(
    {
      title: "Candidates",
      subtitle: data ? `${data.total} ${filtered ? "matching" : "registered"}` : "Registered job seekers",
      actions: (
        <div className="flex gap-2">
          <Button variant="primary" size="sm" disabled={!!busy || !data?.total} icon={busy === "xlsx" ? <Spinner className="size-4" /> : <FileXls weight="bold" className="size-4" />} onClick={() => exportAs("xlsx")}>
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button variant="secondary" size="sm" disabled={!!busy || !data?.total} icon={busy === "csv" ? <Spinner className="size-4" /> : <FileCsv weight="bold" className="size-4" />} onClick={() => exportAs("csv")}>
            CSV
          </Button>
        </div>
      ),
    },
    [data?.total, busy, filtered, values],
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 basis-56">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, skill or city" leading={<MagnifyingGlass className="size-4" />} className="h-10" />
          </div>
          <div className="w-40">
            <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill e.g. React" className="h-10" aria-label="Skill" />
          </div>
          <div className="w-36">
            <Select value={values.city} onChange={(e) => set({ city: e.target.value })} className="h-10" aria-label="City">
              <option value="">Any city</option>
              {facets?.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Select value={values.resume} onChange={(e) => set({ resume: e.target.value })} className="h-10" aria-label="Resume">
              <option value="">Any resume</option>
              <option value="yes">Has a resume</option>
              <option value="no">No resume</option>
            </Select>
          </div>
          <div className="w-40">
            <Select value={values.minExperience} onChange={(e) => set({ minExperience: e.target.value })} className="h-10" aria-label="Minimum experience">
              <option value="">Any experience</option>
              {[1, 2, 3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}+ years
                </option>
              ))}
            </Select>
          </div>
          {filtered && (
            <Button
              variant="ghost"
              onClick={() => {
                clear();
                setSearch("");
                setSkill("");
              }}
            >
              Clear
            </Button>
          )}
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
                    <span className="block truncate text-xs text-muted">
                      {u.email}
                      {u.experienceYears != null && ` · ${u.experienceYears} yrs`}
                    </span>
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
          <EmptyState className="mt-4" icon={<UsersThree className="size-7" />} title="No candidates found" body={filtered ? "Try removing some filters." : undefined} />
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <DownloadSimple className="size-3.5" /> Exports use the filters above. For resumes, use Applications → Export.
          </p>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={(p) => set({ page: String(p) })} />
        </div>
      </div>
    </div>
  );
}
