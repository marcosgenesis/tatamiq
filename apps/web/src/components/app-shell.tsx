import { createContext, useContext } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type Academy = {
  id: string;
  name: string;
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
};

const AppShellCtx = createContext<AppShellContext>({
  activeAcademy: { id: "", name: "" },
  academies: [],
  user: { name: "", email: "" },
  onSwitchAcademy: () => {},
  onSignOut: () => {},
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
  children,
}: AppShellContext & { children: React.ReactNode }) {
  return (
    <AppShellCtx.Provider value={{ activeAcademy, academies, user, onSwitchAcademy, onSignOut }}>
      <SidebarProvider className={cn("[--app-wrapper-max-width:80rem]")}>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AppShellCtx.Provider>
  );
}
