import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import {
  Bookmarks,
  Briefcase,
  Buildings,
  Chalkboard,
  ChartPieSlice,
  GraduationCap,
  House,
  IdentificationCard,
  Key,
  Kanban,
  Student,
  Tray,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { useAuth } from "@/hooks";
import { useMyApplicationsQuery } from "@/store/api";
import { Shell, type NavSection } from "@/components/layout/Shell";
import type { QuickLink } from "@/components/layout/CommandPalette";
import { Splash } from "@/components/layout/Splash";
import { Toaster } from "@/components/ui";

const Home = lazy(() => import("@/pages/public/Home"));
const Explore = lazy(() => import("@/pages/public/Explore"));
const OpportunityDetail = lazy(() => import("@/pages/public/OpportunityDetail"));
const Apply = lazy(() => import("@/pages/public/Apply"));
const NotFound = lazy(() => import("@/pages/public/NotFound"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const MyDashboard = lazy(() => import("@/pages/account/Dashboard"));
const Saved = lazy(() => import("@/pages/account/Saved"));
const Profile = lazy(() => import("@/pages/account/Profile"));
const AdminOverview = lazy(() => import("@/pages/admin/Overview"));
const AdminOpportunities = lazy(() => import("@/pages/admin/Opportunities"));
const AdminOpportunityEditor = lazy(() => import("@/pages/admin/OpportunityEditor"));
const AdminApplications = lazy(() => import("@/pages/admin/Applications"));
const AdminOrganizations = lazy(() => import("@/pages/admin/Organizations"));
const AdminCandidates = lazy(() => import("@/pages/admin/Candidates"));
const AdminApiKeys = lazy(() => import("@/pages/admin/ApiKeys"));

const i = "size-5";

function RequireAuth({ children, role }: { children: ReactNode; role?: "admin" | "candidate" }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Splash />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/me"} replace />;
  return <>{children}</>;
}

function PortalShell() {
  const { user } = useAuth();
  const isCandidate = user?.role === "candidate";
  const { data: apps } = useMyApplicationsQuery(undefined, { skip: !isCandidate });
  const active = apps?.filter((a) => ["shortlisted", "interview", "offered"].includes(a.status)).length ?? 0;

  const sections: NavSection[] = [
    {
      items: [
        { to: "/", label: "Home", icon: <House className={i} />, end: true },
        { to: "/jobs", label: "Jobs", icon: <Briefcase className={i} /> },
        { to: "/internships", label: "Internships", icon: <Student className={i} /> },
        { to: "/programs", label: "Programs & Courses", icon: <GraduationCap className={i} /> },
        { to: "/trainings", label: "Trainings", icon: <Chalkboard className={i} /> },
      ],
    },
  ];
  if (isCandidate) {
    sections.push({
      title: "My space",
      items: [
        { to: "/me", label: "Applications", icon: <Tray className={i} />, end: true, badge: active },
        { to: "/me/saved", label: "Saved", icon: <Bookmarks className={i} /> },
        { to: "/me/profile", label: "Profile", icon: <UserCircle className={i} /> },
      ],
    });
  }
  if (user?.role === "admin") {
    sections.push({ title: "Admin", items: [{ to: "/admin", label: "Admin dashboard", icon: <ChartPieSlice className={i} /> }] });
  }
  return <Shell sections={sections} quickLinks={sections.flatMap((s) => s.items)} bell={isCandidate ? { to: "/me", count: active } : undefined} />;
}

function AdminShell() {
  const sections: NavSection[] = [
    {
      items: [
        { to: "/admin", label: "Overview", icon: <ChartPieSlice className={i} />, end: true },
        { to: "/admin/opportunities", label: "Opportunities", icon: <Kanban className={i} /> },
        { to: "/admin/applications", label: "Applications", icon: <Tray className={i} /> },
        { to: "/admin/organizations", label: "Organizations", icon: <Buildings className={i} /> },
        { to: "/admin/candidates", label: "Candidates", icon: <UsersThree className={i} /> },
        { to: "/admin/api-keys", label: "Partner API", icon: <Key className={i} /> },
      ],
    },
    { title: "Portal", items: [{ to: "/", label: "View portal", icon: <House className={i} />, end: true }] },
  ];
  const quick: QuickLink[] = [
    ...sections.flatMap((s) => s.items),
    { to: "/admin/opportunities/new", label: "Post a new opportunity", icon: <IdentificationCard className="size-4" />, hint: "Create" },
  ];
  return <Shell sections={sections} quickLinks={quick} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/admin"
            element={
              <RequireAuth role="admin">
                <AdminShell />
              </RequireAuth>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="opportunities" element={<AdminOpportunities />} />
            <Route path="opportunities/new" element={<AdminOpportunityEditor />} />
            <Route path="opportunities/:id" element={<AdminOpportunityEditor />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="candidates" element={<AdminCandidates />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
          </Route>

          <Route element={<PortalShell />}>
            <Route index element={<Home />} />
            <Route path="jobs" element={<Explore key="job" type="job" />} />
            <Route path="internships" element={<Explore key="internship" type="internship" />} />
            <Route path="programs" element={<Explore key="program" type="program" />} />
            <Route path="trainings" element={<Explore key="training" type="training" />} />
            <Route path="opportunities/:slug" element={<OpportunityDetail />} />
            <Route path="opportunities/:slug/apply" element={<Apply />} />
            <Route
              path="me"
              element={
                <RequireAuth role="candidate">
                  <MyDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="me/saved"
              element={
                <RequireAuth role="candidate">
                  <Saved />
                </RequireAuth>
              }
            />
            <Route
              path="me/profile"
              element={
                <RequireAuth role="candidate">
                  <Profile />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
