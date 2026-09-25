import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import {
  Bell,
  CaretRight,
  List,
  MagnifyingGlass,
  Moon,
  SignIn,
  SignOut,
  Sun,
  X,
} from "@phosphor-icons/react";
import { useAuth, useHotkey, useTheme } from "@/hooks";
import { api, useLogoutMutation } from "@/store/api";
import { useAppDispatch } from "@/store";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { LogoMark } from "@/components/brand/Logo";
import { Avatar, ButtonLink, IconButton, Kbd, Skeleton } from "@/components/ui";
import { CommandPalette, type QuickLink } from "./CommandPalette";
import { ShellHeaderProvider, useShellHeaderState } from "./ShellContext";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/* -------------------------------------------------------------- rail */

function RailLink({ item, groupId }: { item: NavItem; groupId: string }) {
  return (
    <NavLink to={item.to} end={item.end} className="group relative flex justify-center" aria-label={item.label}>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={`rail-${groupId}`}
              className="absolute inset-y-0 left-1/2 w-11 -translate-x-1/2 rounded-xl bg-surface-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          {isActive && (
            <motion.span layoutId={`rail-bar-${groupId}`} className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          <motion.span
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={cn("relative grid size-11 place-items-center rounded-xl transition-colors", isActive ? "text-ink" : "text-muted group-hover:text-ink-soft")}
          >
            {item.icon}
            {!!item.badge && (
              <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-bold text-black">{item.badge}</span>
            )}
          </motion.span>
          {/* Tooltip */}
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line-strong bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function UserMenu({ align = "rail" }: { align?: "rail" | "header" }) {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [logout] = useLogoutMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) {
    return align === "rail" ? (
      <Link to="/login" aria-label="Sign in" className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink">
        <SignIn className="size-5" />
      </Link>
    ) : null;
  }

  const signOut = async () => {
    setOpen(false);
    await logout().unwrap().catch(() => undefined);
    dispatch(api.util.resetApiState());
    navigate("/");
  };

  return (
    <div ref={ref} className="relative">
      <motion.button whileTap={{ scale: 0.94 }} onClick={() => setOpen((o) => !o)} aria-label="Account menu" className="block rounded-xl ring-2 ring-transparent transition hover:ring-line-strong">
        <Avatar name={user.name} size={align === "rail" ? 40 : 36} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: align === "rail" ? 8 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className={cn(
              "panel absolute z-50 w-64 p-2 shadow-2xl",
              align === "rail" ? "bottom-0 left-full ml-3 origin-bottom-left" : "right-0 top-full mt-2 origin-top-right",
            )}
          >
            <div className="flex items-center gap-3 rounded-xl bg-well p-3">
              <Avatar name={user.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <div className="mt-1 flex flex-col">
              {isAdmin && <MenuLink to="/admin" onClick={() => setOpen(false)} label="Admin dashboard" />}
              {!isAdmin && <MenuLink to="/me" onClick={() => setOpen(false)} label="My dashboard" />}
              {!isAdmin && <MenuLink to="/me/profile" onClick={() => setOpen(false)} label="Profile & resume" />}
              <button onClick={signOut} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">
                <SignOut className="size-4" /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MenuLink = ({ to, label, onClick }: { to: string; label: string; onClick: () => void }) => (
  <Link to={to} onClick={onClick} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink">
    {label}
    <CaretRight className="size-3.5 text-muted" />
  </Link>
);

/* ------------------------------------------------------------ header */

function ThemeToggle() {
  const { theme, set } = useTheme();
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-line bg-well p-1" role="radiogroup" aria-label="Theme">
      {(["dark", "light"] as const).map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={theme === t}
          aria-label={t === "dark" ? "Dark mode" : "Light mode"}
          onClick={() => set(t)}
          className={cn("relative grid size-8 place-items-center rounded-lg transition-colors", theme === t ? "text-ink" : "text-muted hover:text-ink-soft")}
        >
          {theme === t && <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-lg bg-surface-2 shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
          <motion.span key={`${t}-${theme === t}`} initial={{ rotate: -40, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} className="relative">
            {t === "dark" ? <Moon weight={theme === t ? "fill" : "regular"} className="size-4" /> : <Sun weight={theme === t ? "fill" : "regular"} className="size-4" />}
          </motion.span>
        </button>
      ))}
    </div>
  );
}

function PanelHeader({ onSearch, headerActions, bell }: { onSearch: () => void; headerActions?: ReactNode; bell?: { to: string; count: number } }) {
  const header = useShellHeaderState();
  const location = useLocation();
  return (
    <header className="relative z-20 flex flex-wrap items-center gap-3 border-b border-line px-4 pb-4 pt-4 sm:px-6 lg:pt-5">
      <Link to="/" className="lg:hidden" aria-label="Home">
        <LogoMark size={34} animate={false} />
      </Link>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname + String(typeof header.title === "string" ? header.title : "")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease }}
          className="min-w-0 flex-1"
        >
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-[22px]">{header.title}</h1>
          {header.subtitle && <p className="truncate text-[13px] text-muted sm:text-sm">{header.subtitle}</p>}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="group hidden h-10 w-64 items-center gap-2 rounded-xl border border-line bg-well px-3 text-sm text-muted transition-all hover:border-line-strong md:flex xl:w-72"
        >
          <MagnifyingGlass className="size-4" />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘ K</Kbd>
        </button>
        <IconButton label="Search" className="md:hidden" onClick={onSearch}>
          <MagnifyingGlass className="size-4" />
        </IconButton>
        {header.actions}
        {headerActions}
        {bell && (
          <Link to={bell.to}>
            <IconButton label="Updates" dot={bell.count > 0} tabIndex={-1}>
              <Bell className="size-4" />
            </IconButton>
          </Link>
        )}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <div className="lg:hidden">
          <UserMenu align="header" />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------ mobile nav */

function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const primary = sections[0]?.items.slice(0, 4) ?? [];
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  const { user } = useAuth();

  return (
    <>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-line-strong bg-surface/85 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        {primary.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-medium">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="mobile-tab" className="absolute inset-0 rounded-xl bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className={cn("relative", isActive ? "text-brand" : "text-muted")}>{item.icon}</span>
                <span className={cn("relative", isActive ? "text-ink" : "text-muted")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-medium text-muted">
          <List className="size-5" />
          More
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              className="fixed inset-x-2 bottom-2 z-50 max-h-[80dvh] overflow-y-auto rounded-3xl border border-line bg-paper p-4 lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, i) => i.offset.y > 120 && setOpen(false)}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line-strong" />
              <div className="mb-3 flex items-center justify-between">
                <ThemeToggle />
                <IconButton label="Close menu" variant="ghost" onClick={() => setOpen(false)}>
                  <X className="size-5" />
                </IconButton>
              </div>
              {sections.map((s, si) => (
                <div key={si} className="mb-3">
                  {s.title && <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{s.title}</p>}
                  <div className="grid grid-cols-2 gap-1.5">
                    {s.items.map((item, i) => (
                      <motion.div key={item.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * (i + si * 4) }}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            cn("flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium", isActive ? "border-brand/40 bg-brand-soft text-brand" : "border-line bg-surface text-ink-soft")
                          }
                        >
                          {item.icon}
                          {item.label}
                        </NavLink>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
              {!user && (
                <ButtonLink to="/login" variant="primary" block>
                  Sign in
                </ButtonLink>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------ shell */

function ContentFallback() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return <motion.div className="fixed inset-x-0 top-0 z-[80] h-0.5 origin-left bg-gradient-to-r from-brand via-teal to-accent" style={{ scaleX }} />;
}

export function Shell({
  sections,
  railFooter,
  headerActions,
  bell,
  quickLinks,
}: {
  sections: NavSection[];
  railFooter?: ReactNode;
  headerActions?: ReactNode;
  bell?: { to: string; count: number };
  quickLinks: QuickLink[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  useHotkey("k", () => setSearchOpen((o) => !o));
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <ShellHeaderProvider>
      <ScrollProgress />
      <div className="flex min-h-dvh gap-0 p-0 sm:p-2 lg:gap-2">
        {/* Icon rail */}
        <aside className="sticky top-2 hidden h-[calc(100dvh-1rem)] w-[68px] shrink-0 flex-col items-center py-3 lg:flex">
          <Link to="/" aria-label="DigiBizz Jobs home" className="mb-6">
            <LogoMark size={38} />
          </Link>
          <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-visible scrollbar-none">
            {sections.map((s, si) => (
              <div key={si} className="flex flex-col items-center gap-1.5">
                {si > 0 && <span className="my-3 h-px w-8 bg-line" />}
                {s.items.map((item) => (
                  <RailLink key={item.to} item={item} groupId="main" />
                ))}
              </div>
            ))}
          </nav>
          <div className="mt-3 flex flex-col items-center gap-3 border-t border-line pt-4">
            {railFooter}
            <UserMenu />
          </div>
        </aside>

        {/* Main panel */}
        <motion.main
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="relative flex min-h-dvh min-w-0 flex-1 flex-col overflow-hidden border-line bg-paper pb-24 sm:min-h-[calc(100dvh-1rem)] sm:rounded-[22px] sm:border lg:pb-0"
        >
          {/* Soft arc of light across the top-right corner, like the reference. */}
          <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] h-64 w-[55%] rounded-[100%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--ink)_9%,transparent),transparent)]" />
          <PanelHeader onSearch={() => setSearchOpen(true)} headerActions={headerActions} bell={bell} />
          <Suspense fallback={<ContentFallback />}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="relative flex-1"
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </motion.main>
      </div>
      <MobileNav sections={sections} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} links={quickLinks} />
    </ShellHeaderProvider>
  );
}

