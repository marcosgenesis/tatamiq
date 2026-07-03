import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useNavigate,
} from "@tanstack/react-router";
import { CheckmarkSquare03Icon } from "hugeicons-react";
import { LogOut, Timer, VenetianMask } from "lucide-react";
import { type ComponentType, lazy, Suspense, useEffect, useRef, useState } from "react";
import { AppShell } from "./components/app-shell";
import { LogoIcon } from "./components/logo";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { PlaceholderPage } from "./features/placeholder/placeholder-page";
import {
  currentPlatformSupportQuery,
  endPlatformSupport,
  platformMeQuery,
} from "./features/platform/platform-queries";
import { ThemeProvider } from "./hooks/use-theme";
import "./index.css";
import { authClient } from "./lib/auth-client";

const queryClient = new QueryClient();

/** Bounded retry for the post-login org-list race (transient 401 before the session settles). */
const MAX_ORG_LOAD_RETRIES = 5;
const ORG_LOAD_RETRY_DELAY_MS = 400;

type OrganizationSummary = {
  id: string;
  name: string;
  logo?: string | null | undefined;
};

const SignInPage = lazyRoute(() => import("./features/auth/auth-pages"), "SignInPage");
const SignUpPage = lazyRoute(() => import("./features/auth/auth-pages"), "SignUpPage");
const ForgotPasswordPage = lazyRoute(
  () => import("./features/auth/auth-pages"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazyRoute(
  () => import("./features/auth/auth-pages"),
  "ResetPasswordPage",
);
const AcceptStudentInvitePage = lazyRoute<{ token: string }>(
  () => import("./features/student-access/accept-student-invite-page"),
  "AcceptStudentInvitePage",
);
const StudentCheckInPage = lazyRoute(
  () => import("./features/student-access/student-check-in-page"),
  "StudentCheckInPage",
);
const PreRegistrationPage = lazyRoute<{ token: string }>(
  () => import("./features/students/pre-registration-page"),
  "PreRegistrationPage",
);
const FirstAccessPage = lazyRoute<{ token: string }>(
  () => import("./features/students/first-access-page"),
  "FirstAccessPage",
);
const PlatformFirstAccessPage = lazyRoute<{ token: string }>(
  () => import("./features/platform/platform-first-access-page"),
  "PlatformFirstAccessPage",
);
const ChooseAreaPage = lazyRoute(
  () => import("./features/student-access/choose-area-page"),
  "ChooseAreaPage",
);
const StudentDashboardPage = lazyRoute(
  () => import("./features/student-access/student-dashboard-page"),
  "StudentDashboardPage",
);
const StudentAttendancePage = lazyRoute(
  () => import("./features/student-access/student-drilldown-pages"),
  "StudentAttendancePage",
);
const StudentGraduationPage = lazyRoute(
  () => import("./features/student-access/student-drilldown-pages"),
  "StudentGraduationPage",
);
const AcademyOnboardingPage = lazyRoute(
  () => import("./features/auth/academy-onboarding-page"),
  "AcademyOnboardingPage",
);
const PlatformPage = lazyRoute(() => import("./features/platform/platform-page"), "PlatformPage");
const PlatformAuditPage = lazyRoute(
  () => import("./features/platform/platform-audit-page"),
  "PlatformAuditPage",
);
const PlatformAdministratorsPage = lazyRoute(
  () => import("./features/platform/platform-administrators-page"),
  "PlatformAdministratorsPage",
);
const PlatformAcademiesPage = lazyRoute(
  () => import("./features/platform/platform-academies-page"),
  "PlatformAcademiesPage",
);
const PlatformAcademyPage = lazyRoute<{ academyId: string }>(
  () => import("./features/platform/platform-academy-page"),
  "PlatformAcademyPage",
);
const PlatformUsersPage = lazyRoute(
  () => import("./features/platform/platform-users-page"),
  "PlatformUsersPage",
);
const PlatformUserDetailPage = lazyRoute<{ userId: string }>(
  () => import("./features/platform/platform-user-detail-page"),
  "PlatformUserDetailPage",
);
const DashboardPage = lazyRoute(
  () => import("./features/dashboard/dashboard-page"),
  "DashboardPage",
);
const StudentsPage = lazyRoute(() => import("./features/students/students-page"), "StudentsPage");
const ClassGroupsPage = lazyRoute(
  () => import("./features/class-groups/class-groups-page"),
  "ClassGroupsPage",
);
const SchedulePage = lazyRoute(() => import("./features/schedule/schedule-page"), "SchedulePage");
const ActiveClassPage = lazyRoute<{ classId: string }>(
  () => import("./features/classes/active-class-page"),
  "ActiveClassPage",
);
const GraduationPage = lazyRoute(
  () => import("./features/graduation/graduation-page"),
  "GraduationPage",
);
const MonthlyFeesPage = lazyRoute(
  () => import("./features/monthly-fees/monthly-fees-page"),
  "MonthlyFeesPage",
);
const SettingsPage = lazyRoute(() => import("./features/settings/settings-page"), "SettingsPage");

function lazyRoute<TProps extends object = Record<string, never>>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
) {
  const Component = lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<TProps> };
  });

  return function LazyRouteComponent(props: TProps) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// --- Root ---

const rootRoute = createRootRoute({
  component: RootLayout,
});

// --- Layout routes (pathless) ---

const publicLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "public",
  component: PublicLayout,
});

const openLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "open",
  component: Outlet,
});

const authBareLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth-bare",
  component: AuthBareLayout,
});

const instructorLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "instructor",
  component: InstructorLayout,
});

// --- Public routes (redirect to /choose-area if logged in) ---

const signInRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: "/sign-in",
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: "/sign-up",
  component: SignUpPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: "/reset-password",
  component: ResetPasswordPage,
});

// --- Open routes (work with or without auth, no layout shell) ---

const acceptStudentInviteRoute = createRoute({
  getParentRoute: () => openLayout,
  path: "/accept-student-invite/$token",
  component: function AcceptStudentInviteRoute() {
    const { token } = acceptStudentInviteRoute.useParams();
    return <AcceptStudentInvitePage token={token} />;
  },
});

const studentCheckInRoute = createRoute({
  getParentRoute: () => openLayout,
  path: "/student/check-in",
  component: StudentCheckInPage,
});

const preRegistrationRoute = createRoute({
  getParentRoute: () => openLayout,
  path: "/pre-register/$token",
  component: function PreRegistrationRoute() {
    const { token } = preRegistrationRoute.useParams();
    return <PreRegistrationPage token={token} />;
  },
});

const firstAccessRoute = createRoute({
  getParentRoute: () => openLayout,
  path: "/student/first-access/$token",
  component: function FirstAccessRoute() {
    const { token } = firstAccessRoute.useParams();
    return <FirstAccessPage token={token} />;
  },
});

const platformFirstAccessRoute = createRoute({
  getParentRoute: () => openLayout,
  path: "/first-access/$token",
  component: function PlatformFirstAccessRoute() {
    const { token } = platformFirstAccessRoute.useParams();
    return <PlatformFirstAccessPage token={token} />;
  },
});

// --- Auth bare routes (require auth, no layout shell) ---

const chooseAreaRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/choose-area",
  component: ChooseAreaPage,
});

const studentHomeRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/student",
  component: StudentDashboardPage,
});

const studentAttendanceRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/student/attendance",
  component: StudentAttendancePage,
});

const studentGraduationRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/student/graduation",
  component: StudentGraduationPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/onboarding/academy",
  component: AcademyOnboardingPage,
});

const platformRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform",
  component: PlatformPage,
});

const platformAuditRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform/audit",
  component: PlatformAuditPage,
});

const platformAdministratorsRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform/administrators",
  component: PlatformAdministratorsPage,
});

const platformAcademiesRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform/academies",
  component: PlatformAcademiesPage,
});

const platformAcademyRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform/academies/$academyId",
  component: function PlatformAcademyRoute() {
    const { academyId } = platformAcademyRoute.useParams();
    return <PlatformAcademyPage academyId={academyId} />;
  },
});

const platformUsersRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform/users",
  component: PlatformUsersPage,
});

const platformUserDetailRoute = createRoute({
  getParentRoute: () => authBareLayout,
  path: "/platform/users/$userId",
  component: function PlatformUserDetailRoute() {
    const { userId } = platformUserDetailRoute.useParams();
    return <PlatformUserDetailPage userId={userId} />;
  },
});

// --- Instructor routes (require auth + org, AppShell) ---

const indexRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/",
  component: DashboardPage,
});

const studentsRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/students",
  component: StudentsPage,
});

const classGroupsRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/class-groups",
  component: ClassGroupsPage,
});

const scheduleRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/schedule",
  component: SchedulePage,
});

const classRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/classes/$classId",
  component: function ClassPageWrapper() {
    const { classId } = classRoute.useParams();
    return <ActiveClassPage classId={classId} />;
  },
});

const attendancesRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/attendances",
  component: () => (
    <PlaceholderPage
      title="Presenças"
      description="Registros por QR Code, presenças manuais, presença fora da turma e invalidações."
      icon={CheckmarkSquare03Icon}
    />
  ),
});

const graduationRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/graduation",
  component: GraduationPage,
});

const monthlyFeesRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/monthly-fees",
  component: MonthlyFeesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => instructorLayout,
  path: "/settings",
  component: SettingsPage,
});

// --- Route tree ---

const routeTree = rootRoute.addChildren([
  publicLayout.addChildren([signInRoute, signUpRoute, forgotPasswordRoute, resetPasswordRoute]),
  openLayout.addChildren([
    acceptStudentInviteRoute,
    studentCheckInRoute,
    preRegistrationRoute,
    firstAccessRoute,
    platformFirstAccessRoute,
  ]),
  authBareLayout.addChildren([
    chooseAreaRoute,
    studentHomeRoute,
    studentAttendanceRoute,
    studentGraduationRoute,
    onboardingRoute,
    platformRoute,
    platformAuditRoute,
    platformAdministratorsRoute,
    platformAcademiesRoute,
    platformAcademyRoute,
    platformUsersRoute,
    platformUserDetailRoute,
  ]),
  instructorLayout.addChildren([
    indexRoute,
    studentsRoute,
    classGroupsRoute,
    scheduleRoute,
    classRoute,
    attendancesRoute,
    graduationRoute,
    monthlyFeesRoute,
    settingsRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// --- Layout components ---

/**
 * Returns true only while the session is loading for the FIRST time.
 * Background refetches (e.g. triggered by signOut/signUp during a form submit)
 * keep returning false so layouts don't unmount their children mid-flow —
 * otherwise form state and error messages would be wiped by the remount.
 */
function useInitialSessionPending() {
  const session = authClient.useSession();
  const hasResolvedRef = useRef(false);
  if (!session.isPending) hasResolvedRef.current = true;
  return session.isPending && !hasResolvedRef.current;
}

function RootLayout() {
  if (useInitialSessionPending()) return <LoadingScreen />;
  return <Outlet />;
}

function PublicLayout() {
  const session = authClient.useSession();
  if (useInitialSessionPending()) return <LoadingScreen />;
  if (session.data) return <AuthenticatedRedirect />;
  return <Outlet />;
}

function AuthenticatedRedirect() {
  const platform = usePlatformAccess();

  if (platform === "loading") return <LoadingScreen />;
  if (platform === "allowed") return <Navigate to="/platform" />;
  return <Navigate to="/choose-area" />;
}

function AuthBareLayout() {
  const session = authClient.useSession();
  if (!session.data) return <Navigate to="/sign-in" />;
  return <Outlet />;
}

function InstructorLayout() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();
  const [switchingAcademyId, setSwitchingAcademyId] = useState<string | null>(null);

  const [orgLoadRetries, setOrgLoadRetries] = useState(0);

  const firstOrganization = organizations.data?.[0] as OrganizationSummary | undefined;
  const activeAcademy = activeOrganization.data as OrganizationSummary | null | undefined;

  useEffect(() => {
    if (!session.data) return;
    void organizations.refetch();
    void activeOrganization.refetch();
  }, [session.data, organizations.refetch, activeOrganization.refetch]);

  // On a fresh login the org-list request can fire before the session cookie
  // has propagated and come back 401. Without this, an existing instructor gets
  // bounced to /onboarding/academy (where "create academy" then fails with a
  // max-organizations error). Retry the transient failure a few times instead.
  useEffect(() => {
    if (!session.data || !organizations.error || orgLoadRetries >= MAX_ORG_LOAD_RETRIES) return;
    const timer = setTimeout(() => {
      setOrgLoadRetries((count) => count + 1);
      void organizations.refetch();
      void activeOrganization.refetch();
    }, ORG_LOAD_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    session.data,
    organizations.error,
    orgLoadRetries,
    organizations.refetch,
    activeOrganization.refetch,
  ]);

  useEffect(() => {
    if (!session.data || activeAcademy || !firstOrganization) return;
    void authClient.organization.setActive({ organizationId: firstOrganization.id }).then(() => {
      void activeOrganization.refetch();
    });
  }, [session.data, activeAcademy, firstOrganization, activeOrganization.refetch]);

  if (!session.data) return <Navigate to="/sign-in" />;
  if (organizations.isPending || activeOrganization.isPending || switchingAcademyId) {
    return <LoadingScreen />;
  }
  // Still recovering from a transient org-list failure — don't route to onboarding yet.
  if (organizations.error && orgLoadRetries < MAX_ORG_LOAD_RETRIES) return <LoadingScreen />;
  if (!firstOrganization) return <Navigate to="/onboarding/academy" />;
  if (!activeAcademy) return <LoadingScreen />;

  const allAcademies = (organizations.data ?? []).map((org: OrganizationSummary) => ({
    id: org.id,
    name: org.name,
    logo: org.logo,
  }));

  const currentAcademy = {
    id: activeAcademy.id,
    name: activeAcademy.name,
    logo: activeAcademy.logo,
  };

  async function switchAcademy(orgId: string) {
    if (orgId === currentAcademy.id) return;
    setSwitchingAcademyId(orgId);
    queryClient.clear();
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      await Promise.all([organizations.refetch(), activeOrganization.refetch()]);
      queryClient.clear();
    } finally {
      setSwitchingAcademyId(null);
    }
  }

  function refreshAcademies() {
    void organizations.refetch();
    void activeOrganization.refetch();
  }

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/sign-in" });
  }

  const sessionUser = session.data.user;
  const currentUser = {
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image,
  };

  return (
    <AppShell
      activeAcademy={currentAcademy}
      academies={allAcademies}
      user={currentUser}
      onSwitchAcademy={switchAcademy}
      onSignOut={signOut}
      onRefreshAcademies={refreshAcademies}
    >
      <SupportBanner />
      <Outlet />
    </AppShell>
  );
}

function SupportBanner() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const support = useQuery(currentPlatformSupportQuery(session.data?.user.id));

  if (!support.data) return null;

  async function endSupport() {
    await endPlatformSupport();
    await authClient.admin.stopImpersonating();
    queryClient.clear();
    await support.refetch();
    await navigate({ to: "/platform" });
  }

  const adminName = support.data.adminName ?? "Administrador";
  const expiresAt = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(
    new Date(support.data.expiresAt),
  );

  return (
    <div className="border-amber-200 border-b bg-amber-50 px-4 py-3 sm:px-6 dark:border-amber-400/20 dark:bg-[#1c1402]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-amber-200 bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/8">
            <VenetianMask className="size-4.5 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm text-amber-950 dark:text-zinc-50">
                Suporte assistido ativo
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 dark:border-amber-400/20 dark:bg-amber-400/10">
                <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                <span className="font-bold text-[10px] text-amber-800 tracking-wide dark:text-amber-400">
                  AO VIVO
                </span>
              </span>
            </div>
            <p className="text-[13px] text-amber-900/80 dark:text-amber-100/70">
              Você está operando como cliente em nome de {adminName}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-white/60 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
            <Timer className="size-3.5 text-amber-600/70 dark:text-amber-100/50" />
            <span className="text-[12.5px] text-amber-900 dark:text-amber-50/85">
              Expira às {expiresAt}
            </span>
          </span>
          <Button
            variant="outline"
            onClick={endSupport}
            className="flex-1 gap-1.5 border-amber-300 bg-amber-100/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 sm:flex-none dark:border-amber-400/30 dark:bg-amber-400/6 dark:text-amber-400 dark:hover:bg-amber-400/15 dark:hover:text-amber-300"
          >
            <LogOut className="size-3.5" />
            Encerrar suporte
          </Button>
        </div>
      </div>
    </div>
  );
}

function usePlatformAccess(): "loading" | "allowed" | "denied" {
  const session = authClient.useSession();
  const platform = useQuery({
    ...platformMeQuery(session.data?.user.id),
    enabled: !!session.data?.user.id,
  });

  if (session.isPending || platform.isLoading) return "loading";
  if (platform.isSuccess) return "allowed";
  return "denied";
}

export function cacheIdentityKey(userId: string | null | undefined) {
  return userId ?? "anonymous";
}

function SessionCacheBoundary() {
  const queryClientFromProvider = useQueryClient();
  const session = authClient.useSession();
  const identity = cacheIdentityKey(session.data?.user.id);
  const previousIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (session.isPending) return;
    if (previousIdentityRef.current === null) {
      previousIdentityRef.current = identity;
      return;
    }
    if (previousIdentityRef.current === identity) return;
    previousIdentityRef.current = identity;
    queryClientFromProvider.clear();
  }, [identity, queryClientFromProvider, session.isPending]);

  return null;
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <LogoIcon className="size-12" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </main>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionCacheBoundary />
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
