import { BillingHealth } from "@/components/billing-health";
import { WeeklyClassesChart } from "@/components/channel-sales-chart";
import { DashboardActivity } from "@/components/dashboard-activity";
import { DashboardInvoices } from "@/components/dashboard-invoices";
import { WeeklyAttendanceChart } from "@/components/net-revenue-chart";
import { DashboardStats } from "@/components/stats";
import {
  AcademyOnboardingChecklistWidget,
  shouldFocusDashboardOnboarding,
  useAcademyOnboardingChecklistQuery,
} from "@/features/dashboard/academy-onboarding-checklist";

export function Dashboard() {
  const onboarding = useAcademyOnboardingChecklistQuery();

  if (shouldFocusDashboardOnboarding(onboarding.query.data)) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-4 py-8">
        <AcademyOnboardingChecklistWidget centered />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AcademyOnboardingChecklistWidget />
      <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats />
        <WeeklyAttendanceChart />
        <WeeklyClassesChart />
        <DashboardInvoices />
        <BillingHealth />
        <DashboardActivity />
      </div>
    </div>
  );
}
