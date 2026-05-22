import { createContext, useContext } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type Academy = {
  id: string;
  name: string;
};

type AppShellContext = {
  activeAcademy: Academy;
  academies: Academy[];
  onSwitchAcademy: (id: string) => void;
  onSignOut: () => void;
};

const AppShellCtx = createContext<AppShellContext>({
  activeAcademy: { id: "", name: "" },
  academies: [],
  onSwitchAcademy: () => {},
  onSignOut: () => {},
});

export function useAppShell() {
  return useContext(AppShellCtx);
}

export function AppShell({
  activeAcademy,
  academies,
  onSwitchAcademy,
  onSignOut,
  children,
}: AppShellContext & { children: React.ReactNode }) {
  return (
    <AppShellCtx.Provider value={{ activeAcademy, academies, onSwitchAcademy, onSignOut }}>
      <SidebarProvider className={cn("[--app-wrapper-max-width:80rem]")}>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div
            className={cn(
              "flex flex-1 flex-col p-4 md:p-6",
              "mx-auto w-full max-w-(--app-wrapper-max-width)",
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppShellCtx.Provider>
  );
}
