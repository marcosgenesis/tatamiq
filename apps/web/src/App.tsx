import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  CheckmarkSquare03Icon,
  GraduationScrollIcon,
  Money03Icon,
  Settings02Icon,
} from "hugeicons-react";
import { useEffect } from "react";
import { AppShell } from "./components/layout/app-shell";
import {
  AcademyOnboardingPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
} from "./features/auth/auth-pages";
import { ClassGroupsPage } from "./features/class-groups/class-groups-page";
import { ActiveClassPage } from "./features/classes/active-class-page";
import { DashboardPage } from "./features/dashboard/dashboard-page";
import { PlaceholderPage } from "./features/placeholder/placeholder-page";
import { SchedulePage } from "./features/schedule/schedule-page";
import { StudentsPage } from "./features/students/students-page";
import "./index.css";
import { authClient } from "./lib/auth-client";

const queryClient = new QueryClient();
const publicPaths = new Set(["/sign-in", "/sign-up", "/forgot-password", "/reset-password"]);
const onboardingPath = "/onboarding/academy";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: SignUpPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: onboardingPath,
  component: AcademyOnboardingPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const studentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students",
  component: StudentsPage,
});

const classGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/class-groups",
  component: ClassGroupsPage,
});

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule",
  component: SchedulePage,
});

const classRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/classes/$classId",
  component: function ClassPageWrapper() {
    const { classId } = classRoute.useParams();
    return <ActiveClassPage classId={classId} />;
  },
});

const attendancesRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: "/graduation",
  component: () => (
    <PlaceholderPage
      title="Graduação"
      description="Faixas, graus, histórico formal de promoções e elegibilidade interna do instrutor."
      icon={GraduationScrollIcon}
    />
  ),
});

const monthlyFeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/monthly-fees",
  component: () => (
    <PlaceholderPage
      title="Mensalidades"
      description="Cobranças mensais, Pix, comprovantes em verificação, ajustes e mensalidades dispensadas."
      icon={Money03Icon}
    />
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <PlaceholderPage
      title="Configurações"
      description="Dados da academia, Pix da academia, preferências e regras editáveis da operação."
      icon={Settings02Icon}
    />
  ),
});

const routeTree = rootRoute.addChildren([
  signInRoute,
  signUpRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  onboardingRoute,
  indexRoute,
  studentsRoute,
  classGroupsRoute,
  scheduleRoute,
  classRoute,
  attendancesRoute,
  graduationRoute,
  monthlyFeesRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

type OrganizationSummary = {
  id: string;
  name: string;
};

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const session = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();
  const isPublicPath = publicPaths.has(pathname);
  const isOnboardingPath = pathname === onboardingPath;
  const firstOrganization = organizations.data?.[0] as OrganizationSummary | undefined;
  const activeAcademy = activeOrganization.data as OrganizationSummary | null | undefined;
  const isLoading =
    session.isPending ||
    (!!session.data && (organizations.isPending || activeOrganization.isPending));

  useEffect(() => {
    if (!session.data) return;
    void organizations.refetch();
    void activeOrganization.refetch();
  }, [session.data, organizations.refetch, activeOrganization.refetch]);

  useEffect(() => {
    if (!session.data || activeAcademy || !firstOrganization) return;
    void authClient.organization.setActive({ organizationId: firstOrganization.id }).then(() => {
      void activeOrganization.refetch();
    });
  }, [session.data, activeAcademy, firstOrganization, activeOrganization.refetch]);

  async function signOut() {
    await authClient.signOut();
    await navigate({ to: "/sign-in" });
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session.data && !isPublicPath) {
    return <Navigate to="/sign-in" />;
  }

  if (session.data && isPublicPath) {
    return <Navigate to={firstOrganization ? "/" : onboardingPath} />;
  }

  if (session.data && !firstOrganization && !isOnboardingPath) {
    return <Navigate to={onboardingPath} />;
  }

  if (session.data && firstOrganization && isOnboardingPath) {
    return <Navigate to="/" />;
  }

  if (isPublicPath || isOnboardingPath) {
    return <Outlet />;
  }

  return (
    <AppShell
      academyName={activeAcademy?.name ?? firstOrganization?.name ?? "Academia"}
      onSignOut={signOut}
    >
      <Outlet />
    </AppShell>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="rounded-3xl border border-border bg-card/80 px-6 py-5 text-sm text-muted-foreground shadow-2xl">
        Carregando Tatamiq...
      </div>
    </main>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
