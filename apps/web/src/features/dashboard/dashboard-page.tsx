import { Dashboard } from "@/components/dashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardMobile } from "./dashboard-mobile";

export function DashboardPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <DashboardMobile />;
  return <Dashboard />;
}
