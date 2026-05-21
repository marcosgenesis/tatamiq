import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  BeltIcon,
  Calendar03Icon,
  CheckmarkSquare03Icon,
  GraduationScrollIcon,
  Money03Icon,
  Settings02Icon,
  UserMultipleIcon,
} from "hugeicons-react";
import { AppShell } from "./components/layout/app-shell";
import { DashboardPage } from "./features/dashboard/dashboard-page";
import { PlaceholderPage } from "./features/placeholder/placeholder-page";
import "./index.css";

const queryClient = new QueryClient();

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const studentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/students",
  component: () => (
    <PlaceholderPage
      title="Alunos"
      description="Cadastro, status, responsáveis, turmas vinculadas e histórico operacional dos alunos."
      icon={UserMultipleIcon}
    />
  ),
});

const classGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/class-groups",
  component: () => (
    <PlaceholderPage
      title="Turmas"
      description="Organização das turmas recorrentes, etiquetas, duração padrão e vínculos de alunos."
      icon={BeltIcon}
    />
  ),
});

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule",
  component: () => (
    <PlaceholderPage
      title="Agenda"
      description="Semana de aulas recorrentes, aulas avulsas, cancelamentos e próximas chamadas."
      icon={Calendar03Icon}
    />
  ),
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
  indexRoute,
  studentsRoute,
  classGroupsRoute,
  scheduleRoute,
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
