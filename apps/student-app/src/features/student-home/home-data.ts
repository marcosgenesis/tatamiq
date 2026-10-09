import type {
  StudentAttendancesResponse,
  StudentDailyFeesResponse,
  StudentGraduationResponse,
  StudentMeResponse,
  StudentMonthlyFeesResponse,
  StudentNextClassResponse,
} from "@appdosensei/contracts";

import type { IconName } from "@/components/icon";

export type StudentHomeData = {
  me: StudentMeResponse;
  nextClass: StudentNextClassResponse;
  graduation: StudentGraduationResponse;
  attendances: StudentAttendancesResponse;
  monthlyFees: StudentMonthlyFeesResponse;
  dailyFees: StudentDailyFeesResponse;
};

export type HomeActivity = {
  id: string;
  icon: IconName;
  iconColor: string;
  iconBackgroundClassName: string;
  title: string;
  subtitle: string;
  at: number;
};

export type HomeFeeSummary = {
  value: "Atraso" | "Pendente" | "Em dia";
  label: string;
  color: string;
  backgroundClassName: string;
};

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function getInitial(name: string): string {
  return getFirstName(name).charAt(0).toUpperCase();
}

export function countAttendancesThisMonth(
  attendances: StudentAttendancesResponse["attendances"],
  now = new Date(),
): number {
  return attendances.filter((attendance) => {
    if (attendance.invalidatedAt) return false;
    const date = new Date(attendance.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
}

export function deriveFeeSummary(
  monthlyFees: StudentMonthlyFeesResponse,
  dailyFees: StudentDailyFeesResponse,
): HomeFeeSummary {
  const hasOverdueMonthlyFee = monthlyFees.fees.some(
    (fee) => fee.status === "open" && fee.isOverdue,
  );
  const hasOpenFee =
    monthlyFees.fees.some((fee) => fee.status === "open") ||
    dailyFees.fees.some((fee) => fee.status === "open");

  if (hasOverdueMonthlyFee) {
    return {
      value: "Atraso",
      label: "Regularize já",
      color: "#E5484D",
      backgroundClassName: "bg-danger-soft",
    };
  }

  if (hasOpenFee) {
    return {
      value: "Pendente",
      label: "Tem cobrança aberta",
      color: "#B7791F",
      backgroundClassName: "bg-[#FFF4D6]",
    };
  }

  return {
    value: "Em dia",
    label: "Tudo certo",
    color: "#1E9E5A",
    backgroundClassName: "bg-success-soft",
  };
}

export function buildRecentActivity(data: StudentHomeData): HomeActivity[] {
  const items: HomeActivity[] = [];
  const latestPromotion = data.graduation.promotions
    .slice()
    .sort((a, b) => +new Date(b.promotedAt) - +new Date(a.promotedAt))[0];
  const latestAttendance = data.attendances.attendances.find(
    (attendance) => !attendance.invalidatedAt,
  );
  const latestPaidFee = data.monthlyFees.fees.find((fee) => fee.status === "paid" && fee.paidAt);

  if (latestPromotion) {
    items.push({
      id: `promotion-${latestPromotion.id}`,
      icon: "award",
      iconColor: "#F4531C",
      iconBackgroundClassName: "bg-brand-soft",
      title:
        latestPromotion.newDegree > 0
          ? `Promovido para ${latestPromotion.newDegree}º grau`
          : `Faixa ${latestPromotion.newBeltName}`,
      subtitle: formatShortDate(latestPromotion.promotedAt),
      at: +new Date(latestPromotion.promotedAt),
    });
  }

  if (latestAttendance) {
    items.push({
      id: `attendance-${latestAttendance.id}`,
      icon: "check-circle",
      iconColor: "#1E9E5A",
      iconBackgroundClassName: "bg-success-soft",
      title: "Check-in confirmado",
      subtitle: `${latestAttendance.classGroupName} · ${formatShortDate(latestAttendance.createdAt)}`,
      at: +new Date(latestAttendance.createdAt),
    });
  }

  if (latestPaidFee?.paidAt) {
    items.push({
      id: `fee-${latestPaidFee.id}`,
      icon: "wallet",
      iconColor: "#8B857E",
      iconBackgroundClassName: "bg-canvas",
      title: "Mensalidade paga",
      subtitle: formatShortDate(latestPaidFee.paidAt),
      at: +new Date(latestPaidFee.paidAt),
    });
  }

  return items.sort((a, b) => b.at - a.at).slice(0, 3);
}

export function formatClassBadge(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(date)
    .replace(".", "");
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${isToday ? "Hoje" : weekday} · ${time}`;
}

export function formatClassDetails(value: string, durationMinutes: number): string {
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(value));
  return `${weekday} · ${durationMinutes} min`;
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(value))
    .replace(" de ", " ");
}
