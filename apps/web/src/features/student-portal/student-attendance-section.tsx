import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FireIcon, QrCodeIcon } from "hugeicons-react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/utils";
import { StudentEmptyState } from "./components/student-empty-state";
import { dayOfMonth, weekdayShort } from "./lib/student-format";

type Attendance = {
  id: string;
  classGroupName: string;
  source: string;
  isOutOfGroup: boolean;
  invalidatedAt: string | null;
  createdAt: string;
};

const MONTH_FMT = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function StudentAttendanceSection() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["student", "attendances"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.GET as any)("/student/attendances");
      if (error) throw new Error("Não foi possível carregar presenças.");
      return data as { attendances: Attendance[] };
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Erro ao carregar presenças.</p>;
  }

  const attendances = query.data.attendances;

  if (attendances.length === 0) {
    return (
      <StudentEmptyState
        icon={QrCodeIcon}
        tone="primary"
        title="Nenhuma presença ainda"
        description="Faça check-in na sua próxima aula para começar a registrar sua evolução no tatame."
        action={
          <Button onClick={() => navigate({ to: "/student/check-in" })}>
            <QrCodeIcon aria-hidden="true" />
            Fazer check-in
          </Button>
        }
      />
    );
  }

  const valid = attendances.filter((a) => !a.invalidatedAt);
  const now = new Date();
  const thisMonth = valid.filter((a) => sameMonth(a.createdAt, now)).length;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = valid.filter((a) => sameMonth(a.createdAt, lastMonthDate)).length;
  const delta = thisMonth - lastMonth;
  const weeks = weeklyBuckets(valid, now);
  const maxWeek = Math.max(1, ...weeks);
  const groups = groupByMonth(attendances);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-[2.4rem] font-bold leading-none">{thisMonth}</span>
              <span className="pb-1 text-sm font-semibold text-muted-foreground">presenças</span>
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground capitalize">
              em {MONTH_FMT.format(now)}
            </p>
          </div>
          {delta !== 0 ? (
            <Badge variant={delta > 0 ? "success-light" : "muted"}>
              <FireIcon aria-hidden="true" />
              {delta > 0 ? `+${delta}` : delta} vs. mês anterior
            </Badge>
          ) : null}
        </div>
        <div className="mt-4 flex h-16 items-end gap-1.5">
          {weeks.map((count, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 8-week window
              key={i}
              className={cn("flex-1 rounded-md", i >= 5 ? "bg-primary" : "bg-primary/25")}
              style={{ height: `${Math.max(8, (count / maxWeek) * 100)}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-[0.7rem] font-medium text-muted-foreground">Últimas 8 semanas</p>
      </section>

      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="mb-3 font-heading text-[0.95rem] font-bold tracking-tight capitalize">
            {group.label}
          </h3>
          <div className="space-y-2.5">
            {group.items.map((att) => {
              const invalid = Boolean(att.invalidatedAt);
              return (
                <div
                  key={att.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-border bg-card p-3",
                    invalid && "bg-muted/40",
                  )}
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-center">
                    <span
                      className={cn(
                        "text-[0.95rem] font-bold leading-none",
                        invalid && "text-muted-foreground",
                      )}
                    >
                      {dayOfMonth(att.createdAt)}
                    </span>
                    <span className="text-[0.6rem] font-medium text-muted-foreground">
                      {weekdayShort(att.createdAt)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-semibold",
                        invalid && "text-muted-foreground line-through",
                      )}
                    >
                      {att.classGroupName}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatTime(att.createdAt)}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-muted-foreground">
                        {att.source === "qr" ? "QR" : "Manual"}
                      </span>
                    </div>
                  </div>
                  {invalid ? (
                    <Badge variant="destructive-light">Invalidada</Badge>
                  ) : att.isOutOfGroup ? (
                    <Badge variant="info">Fora da turma</Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

function weeklyBuckets(items: Attendance[], now: Date): number[] {
  const buckets = new Array(8).fill(0);
  const msWeek = 7 * 86_400_000;
  for (const a of items) {
    const weeksAgo = Math.floor((now.getTime() - new Date(a.createdAt).getTime()) / msWeek);
    if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += 1;
  }
  return buckets;
}

function groupByMonth(items: Attendance[]): Array<{ label: string; items: Attendance[] }> {
  const map = new Map<string, Attendance[]>();
  for (const a of [...items].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))) {
    const label = MONTH_FMT.format(new Date(a.createdAt));
    const list = map.get(label) ?? [];
    list.push(a);
    map.set(label, list);
  }
  return [...map.entries()].map(([label, list]) => ({ label, items: list }));
}
