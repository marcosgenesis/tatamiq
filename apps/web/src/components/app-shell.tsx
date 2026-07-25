import { createContext, useContext } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type Academy = {
  id: string;
  name: string;
  logo?: string | null | undefined;
};

export type AppShellUser = {
  name: string;
  email: string;
  image?: string | null | undefined;
};

type AppShellContext = {
  activeAcademy: Academy;
  academies: Academy[];
  user: AppShellUser;
  onSwitchAcademy: (id: string) => void;
  onSignOut: () => void;
  onRefreshAcademies: () => void;
};

const AppShellCtx = createContext<AppShellContext>({
  activeAcademy: { id: "", name: "" },
  academies: [],
  user: { name: "", email: "" },
  onSwitchAcademy: () => {},
  onSignOut: () => {},
  onRefreshAcademies: () => {},
});

export function useAppShell() {
  return useContext(AppShellCtx);
}

export function AppShell({
  activeAcademy,
  academies,
  user,
  onSwitchAcademy,
  onSignOut,
  onRefreshAcademies,
  children,
}: AppShellContext & { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <AppShellCtx.Provider
      value={{ activeAcademy, academies, user, onSwitchAcademy, onSignOut, onRefreshAcademies }}
    >
      {isMobile ? (
        <MobileShell>{children}</MobileShell>
      ) : (
        <SidebarProvider className={cn("[--app-wrapper-max-width:80rem]")}>
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
      )}
    </AppShellCtx.Provider>
  );
}
