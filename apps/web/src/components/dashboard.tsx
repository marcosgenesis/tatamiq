import { BillingHealth } from "@/components/billing-health";
import { WeeklyClassesChart } from "@/components/channel-sales-chart";
import { DashboardActivity } from "@/components/dashboard-activity";
import { DashboardInvoices } from "@/components/dashboard-invoices";
import { WeeklyAttendanceChart } from "@/components/net-revenue-chart";
import { DashboardStats } from "@/components/stats";

export function Dashboard() {
  return (
    <div className="space-y-6">
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
