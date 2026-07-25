import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  QrCodeIcon,
} from "hugeicons-react";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import { MobileScreen, StatusPill } from "@/components/mobile/mobile-ui";
import { academyQueryKey } from "@/lib/academy-query-keys";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { feeStatusBadge } from "../monthly-fees/fee-status";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function weekStartIso() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split("T")[0];
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    .format(new Date())
    .replace(".", "");
}

export function DashboardMobile() {
  const { activeAcademy } = useAppShell();
  const academyId = activeAcademy.id;

  const studentsQuery = useQuery({
    queryKey: academyQueryKey(academyId, "students", "all"),
    queryFn: async () => {
      const { data } = await api.GET("/students", { params: { query: { status: "all" } } });
      return data ?? null;
    },
  });
  const feesQuery = useQuery({
    queryKey: academyQueryKey(academyId, "monthly-fees", "dashboard"),
    queryFn: async () => {
      const { data } = await api.GET("/monthly-fees", { params: { query: {} } });
      return data ?? null;
    },
  });
  const todayQuery = useQuery({
    queryKey: academyQueryKey(academyId, "schedule", "today"),
    queryFn: async () => {
      const { data } = await api.GET("/schedule/today");
      return data ?? null;
    },
  });
  const weekQuery = useQuery({
    queryKey: academyQueryKey(academyId, "schedule", "week", weekStartIso()),
    queryFn: async () => {
      const { data } = await api.GET("/schedule/week", {
        params: { query: { weekStart: weekStartIso() } },
      });
      return data ?? null;
    },
  });

  const studentsSummary = studentsQuery.data?.summary;
  const feesSummary = feesQuery.data?.summary;
  const occurrences = (todayQuery.data?.occurrences ?? [])
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const activeOrNext =
    occurrences.find((o) => o.status === "active") ??
    occurrences.find((o) => o.status === "scheduled");
  const otherClasses = occurrences.filter((o) => o.id !== activeOrNext?.id);

  const paidCents =
    feesQuery.data?.fees
      ?.filter((f) => f.status === "paid")
      .reduce((sum, f) => sum + f.amountInCents, 0) ?? 0;
  const recentFees = (feesQuery.data?.fees ?? []).filter((f) => f.status !== "waived").slice(0, 4);

  const hasFinanceIssues = (feesSummary?.overdue ?? 0) > 0 || (feesSummary?.underReview ?? 0) > 0;

  const todayIdx = new Date().getDay();
  const bars = (weekQuery.data?.days ?? []).map((d) => {
    const present = d.occurrences
      .filter((o) => o.status === "ended")
      .reduce((sum, o) => sum + (o.attendanceCount ?? 0), 0);
    return {
      date: d.date,
      label: WEEKDAYS[d.weekday] ?? "",
      present,
      isToday: d.weekday === todayIdx,
    };
  });
  const maxBar = Math.max(1, ...bars.map((b) => b.present));
  const totalPresent = bars.reduce((sum, b) => sum + b.present, 0);

  const stats: {
    label: string;
    value: string;
    sub: string;
    tone: "neutral" | "warning" | "success";
  }[] = [
    {
      label: "Alunos ativos",
      value: String(studentsSummary?.active ?? "—"),
      sub: `${studentsSummary?.inactive ?? 0} inativos`,
      tone: "neutral",
    },
    {
      label: "Aulas hoje",
      value: String(occurrences.length),
      sub: `${occurrences.filter((o) => o.status === "ended").length} finalizadas`,
      tone: "neutral",
    },
    {
      label: "Em verificação",
      value: String(feesSummary?.underReview ?? "—"),
      sub: `${feesSummary?.overdue ?? 0} atrasadas`,
      tone: "warning",
    },
    {
      label: "Recebido no mês",
      value: formatCurrency(paidCents),
      sub: `${feesSummary?.paid ?? 0} pagas`,
      tone: "success",
    },
  ];

  return (
    <MobileScreen className="gap-5">
      {/* Aulas de hoje */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-medium text-m-ink">Aulas de hoje</h2>
          <span className="text-[12px] text-m-ink-2 first-letter:uppercase">{todayLabel()}</span>
        </div>

        {activeOrNext ? (
          <Link
            to="/classes/$classId"
            params={{ classId: activeOrNext.id }}
            className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[17px] font-medium text-m-ink">{activeOrNext.classGroupName}</p>
                <p className="text-[13px] text-m-ink-2">
                  {activeOrNext.startTime} · {activeOrNext.durationMinutes} min
                </p>
              </div>
              {activeOrNext.status === "active" ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="text-[12px] font-medium text-primary-soft-foreground">
                    Em andamento
                  </span>
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-m-surface px-2.5 py-1 text-[12px] text-m-ink-2">
                  Agendada
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-m-ink-2">Presença registrada</span>
                <span className="text-[13px] font-medium text-m-ink tabular-nums">
                  {activeOrNext.attendanceCount ?? 0} / {activeOrNext.studentCount}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-m-surface">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.round(
                      ((activeOrNext.attendanceCount ?? 0) /
                        Math.max(1, activeOrNext.studentCount)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <span className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-[15px] font-medium text-m-ink">
              <QrCodeIcon className="size-5" strokeWidth={1.8} /> Registrar presença
            </span>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-[13px] text-m-ink-2">
            Nenhuma aula programada para hoje.
          </div>
        )}

        {otherClasses.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {otherClasses.map((occ, i) => (
              <div
                key={occ.id}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3",
                  i < otherClasses.length - 1 && "border-border border-b",
                )}
              >
                <span className="w-[42px] shrink-0 text-[13px] font-medium text-m-ink tabular-nums">
                  {occ.startTime}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] text-m-ink">{occ.classGroupName}</span>
                  <span
                    className={cn(
                      "text-[12px]",
                      occ.status === "ended" ? "text-emerald-600" : "text-m-ink-3",
                    )}
                  >
                    {occ.status === "ended"
                      ? "Finalizada"
                      : `${occ.durationMinutes} min · ${occ.studentCount} alunos`}
                  </span>
                </div>
                <span className="shrink-0 text-[13px] text-m-ink-2 tabular-nums">
                  {occ.attendanceCount ?? 0} / {occ.studentCount}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Stats 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5"
          >
            <span className="text-[12px] text-m-ink-2">{s.label}</span>
            <span className="text-[24px] font-medium text-m-ink tabular-nums leading-none">
              {s.value}
            </span>
            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-[12px]",
                s.tone === "warning" && "bg-warning/15 text-warning-foreground",
                s.tone === "success" && "bg-success/15 text-success-foreground",
                s.tone === "neutral" && "bg-m-surface text-m-ink",
              )}
            >
              {s.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Saúde financeira */}
      <Link
        to="/monthly-fees"
        className={cn(
          "flex items-center gap-3 rounded-2xl p-3.5",
          hasFinanceIssues ? "bg-warning/15" : "bg-success/15",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card">
          {hasFinanceIssues ? (
            <AlertCircleIcon className="size-[18px] text-warning-foreground" strokeWidth={1.8} />
          ) : (
            <CheckmarkCircle02Icon
              className="size-[18px] text-success-foreground"
              strokeWidth={1.8}
            />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "text-[14px] font-medium",
              hasFinanceIssues ? "text-warning-foreground" : "text-success-foreground",
            )}
          >
            {hasFinanceIssues ? "Atenção necessária" : "Tudo em dia"}
          </span>
          <span
            className={cn(
              "text-[12px]",
              hasFinanceIssues ? "text-warning-foreground/80" : "text-success-foreground/80",
            )}
          >
            {hasFinanceIssues
              ? `${feesSummary?.overdue ?? 0} atrasadas · ${feesSummary?.underReview ?? 0} em verificação`
              : "Pagamentos e cobranças em dia."}
          </span>
        </div>
        <ArrowRight01Icon
          className={cn(
            "size-[18px] shrink-0",
            hasFinanceIssues ? "text-warning-foreground" : "text-success-foreground",
          )}
          strokeWidth={1.8}
        />
      </Link>

      {/* Presenças da semana */}
      <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-medium text-m-ink">Presenças da semana</h3>
          <span className="text-[12px] text-m-ink-2 tabular-nums">{totalPresent} presenças</span>
        </div>
        <div className="flex h-[120px] items-end gap-1.5">
          {bars.map((b) => (
            <div key={b.date} className="flex flex-1 items-end justify-center">
              <div
                className={cn(
                  "w-full rounded-t-md",
                  b.isToday ? "bg-primary" : "bg-primary-soft-border",
                )}
                style={{ height: `${Math.max(4, Math.round((b.present / maxBar) * 116))}px` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {bars.map((b) => (
            <span
              key={b.date}
              className={cn(
                "flex-1 text-center text-[12px]",
                b.isToday ? "font-medium text-m-ink" : "text-m-ink-3",
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
      </section>

      {/* Mensalidades recentes */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-border border-b px-3.5 py-3">
          <h3 className="text-[15px] font-medium text-m-ink">Mensalidades recentes</h3>
          <Link
            to="/monthly-fees"
            className="flex items-center gap-0.5 text-[13px] font-medium text-primary-strong"
          >
            Ver todas <ArrowRight01Icon className="size-[15px]" strokeWidth={1.8} />
          </Link>
        </div>
        {recentFees.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[13px] text-m-ink-3">Nenhuma mensalidade.</p>
        ) : (
          recentFees.map((fee, i) => (
            <div
              key={fee.id}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-3",
                i < recentFees.length - 1 && "border-border border-b",
              )}
            >
              <span className="min-w-0 flex-1 truncate text-[14px] text-m-ink">
                {fee.studentName}
              </span>
              <StatusPill tone={feeStatusBadge(fee).tone} className="px-2 py-0.5">
                {feeStatusBadge(fee).label}
              </StatusPill>
              <span className="w-[58px] shrink-0 text-right text-[13px] font-medium text-m-ink tabular-nums">
                {formatCurrency(fee.amountInCents)}
              </span>
            </div>
          ))
        )}
      </section>
    </MobileScreen>
  );
}
