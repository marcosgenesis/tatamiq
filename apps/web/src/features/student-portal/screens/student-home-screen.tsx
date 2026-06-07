import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight01Icon,
  Award01Icon,
  CheckmarkCircle03Icon,
  FireIcon,
  Notification01Icon,
  QrCodeIcon,
  Wallet01Icon,
} from "hugeicons-react";
import type { ComponentType, ReactNode } from "react";
import { api } from "../../../api";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { getInitials } from "../../student-access/student-mobile-shell";
import { BeltVisual } from "../components/belt-visual";
import { beltProgress, type GraduationInput } from "../lib/belt-progress";
import { startsInLabel } from "../lib/student-format";

type HomeData = {
  student: { name: string; status: string };
  academy: { name: string };
  upcomingClasses: Array<{
    id: string;
    classGroupName: string;
    status: string;
    scheduledStartAt: string;
    durationMinutes: number;
  }>;
};

type ActivityItem = {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  meta: string;
  at: number;
};

export function StudentHomeScreen({ data }: { data: HomeData }) {
  const navigate = useNavigate();

  const graduationQuery = useQuery({
    queryKey: ["student", "graduation"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data: g, error } = await (api.GET as any)("/student/graduation");
      if (error) throw new Error("graduation");
      return g as GraduationInput;
    },
  });
  const attendancesQuery = useQuery({
    queryKey: ["student", "attendances"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data: a, error } = await (api.GET as any)("/student/attendances");
      if (error) throw new Error("attendances");
      return a as {
        attendances: Array<{
          classGroupName: string;
          createdAt: string;
          invalidatedAt: string | null;
        }>;
      };
    },
  });
  const feesQuery = useQuery({
    queryKey: ["student", "monthly-fees"],
    queryFn: async () => {
      const { data: f, error } = await api.GET("/student/monthly-fees");
      if (error) throw new Error("fees");
      return f;
    },
  });

  const nextClass = data.upcomingClasses.find((c) => c.status !== "cancelled") ?? null;
  const belt = graduationQuery.data ? beltProgress(graduationQuery.data) : null;

  const monthAttendances = (attendancesQuery.data?.attendances ?? []).filter(
    (a) => !a.invalidatedAt && isThisMonth(a.createdAt),
  );

  const feeStatus = deriveFeeStatus(feesQuery.data);
  const activity = buildActivity(graduationQuery.data, attendancesQuery.data, feesQuery.data);

  return (
    <div>
      {/* Hero */}
      <header className="rounded-b-[1.75rem] bg-neutral-900 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-7 text-white">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-[1.45rem] font-bold tracking-tight">
              Olá, {data.student.name.split(/\s+/)[0]}
            </h1>
            <p className="text-sm font-medium text-white/60">{data.academy.name}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Notificações"
              className="grid size-[2.6rem] place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/15"
            >
              <Notification01Icon className="size-[1.2rem] text-white" aria-hidden="true" />
            </button>
            <span className="grid size-[2.6rem] place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {getInitials(data.student.name)}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/60">Sua faixa</span>
            <button
              type="button"
              onClick={() => navigate({ to: "/student/graduation" })}
              className="flex items-center gap-0.5 text-xs font-semibold text-[#ff7a3d]"
            >
              Graduação
              <ArrowRight01Icon className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2.5">
            {belt ? (
              <BeltVisual
                beltKey={belt.beltKey}
                degrees={belt.degree}
                imagePath={graduationQuery.data?.currentBelt?.path}
              />
            ) : (
              <Skeleton className="h-[30px] w-full rounded-md bg-white/10" />
            )}
          </div>
          {belt ? (
            <>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[0.95rem] font-bold">Faixa {belt.beltName}</span>
                <span className="text-[0.8rem] font-medium text-white/80">
                  {belt.degree} {belt.degree === 1 ? "grau" : "graus"}
                </span>
              </div>
              <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${Math.round(belt.progress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[0.7rem] font-medium text-white/55">{belt.nextCopy}</p>
            </>
          ) : null}
        </div>
      </header>

      {/* Body */}
      <div className="space-y-4 p-5">
        {nextClass ? (
          <NextClassCard
            nextClass={nextClass}
            onCheckIn={() => navigate({ to: "/student/check-in" })}
          />
        ) : (
          <CheckInNudge onCheckIn={() => navigate({ to: "/student/check-in" })} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={FireIcon}
            tone="primary"
            value={attendancesQuery.isLoading ? "—" : String(monthAttendances.length)}
            label="Presenças este mês"
          />
          <StatTile
            icon={CheckmarkCircle03Icon}
            tone={feeStatus.tone}
            value={feeStatus.value}
            label={feeStatus.label}
            valueClass={feeStatus.valueClass}
          />
        </div>

        <div>
          <h2 className="mb-3 font-heading text-[0.95rem] font-bold tracking-tight">
            Atividade recente
          </h2>
          {activity.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {activity.map((item) => (
                <li key={`${item.title}-${item.at}`} className="flex items-center gap-3 p-3.5">
                  <span className={cn("grid size-9 place-items-center rounded-xl", item.tone)}>
                    <item.icon className="size-[1.1rem]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {item.meta}
                    </p>
                  </div>
                  <ArrowRight01Icon
                    className="size-4 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-8 text-center">
              <span className="mb-1 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <FireIcon className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold">Nada por aqui ainda</p>
              <p className="max-w-[16rem] text-xs font-medium text-muted-foreground">
                Seus check-ins e conquistas vão aparecer aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NextClassCard({
  nextClass,
  onCheckIn,
}: {
  nextClass: HomeData["upcomingClasses"][number];
  onCheckIn: () => void;
}) {
  const startsIn = startsInLabel(nextClass.scheduledStartAt);
  return (
    <section className="rounded-2xl border border-border bg-card p-[1.1rem] shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[0.8rem] font-bold text-muted-foreground">Próxima aula</span>
        {startsIn ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.7rem] font-bold text-primary">
            {startsIn}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-[1.2rem] font-bold tracking-tight">{nextClass.classGroupName}</h3>
      <p className="mt-1.5 text-[0.85rem] font-medium text-muted-foreground">
        {new Intl.DateTimeFormat("pt-BR", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(nextClass.scheduledStartAt))}{" "}
        · {nextClass.durationMinutes} min
      </p>
      <button
        type="button"
        onClick={onCheckIn}
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
      >
        <QrCodeIcon className="size-4" aria-hidden="true" />
        Fazer check-in
      </button>
    </section>
  );
}

function CheckInNudge({ onCheckIn }: { onCheckIn: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-[1.25rem] shadow-sm">
      <div className="flex items-center gap-3.5">
        <span className="grid size-[2.9rem] place-items-center rounded-xl bg-primary/10">
          <QrCodeIcon className="size-[1.4rem] text-primary" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-[1rem] font-bold tracking-tight">Faça seu primeiro check-in</h3>
          <p className="mt-1 text-[0.8rem] font-medium text-muted-foreground">
            Registre presença na próxima aula e veja sua evolução começar.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCheckIn}
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <QrCodeIcon className="size-4" aria-hidden="true" />
        Fazer check-in
      </button>
    </section>
  );
}

function StatTile({
  icon: Icon,
  tone,
  value,
  label,
  valueClass,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <span className={cn("grid size-[2.1rem] place-items-center rounded-[0.7rem]", tone)}>
        <Icon className="size-[1.1rem]" aria-hidden="true" />
      </span>
      <span className={cn("text-[1.5rem] font-bold leading-none", valueClass)}>{value}</span>
      <span className="text-[0.78rem] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function deriveFeeStatus(fees: unknown): {
  value: string;
  label: string;
  tone: string;
  valueClass: string;
} {
  const list =
    (fees as { fees?: Array<{ status: string; isOverdue?: boolean }> } | undefined)?.fees ?? [];
  const overdue = list.find((f) => f.isOverdue && f.status === "open");
  const open = list.find((f) => f.status === "open");
  if (overdue)
    return {
      value: "Atraso",
      label: "Regularize já",
      tone: "bg-destructive/10 text-destructive",
      valueClass: "text-destructive",
    };
  if (open)
    return {
      value: "Pendente",
      label: "Tem cobrança aberta",
      tone: "bg-amber-500/10 text-amber-600",
      valueClass: "text-amber-600",
    };
  return {
    value: "Em dia",
    label: "Tudo certo",
    tone: "bg-emerald-500/10 text-emerald-600",
    valueClass: "text-emerald-600",
  };
}

function buildActivity(
  graduation: GraduationInput | undefined,
  // biome-ignore lint/suspicious/noExplicitAny: composed from loosely-typed endpoints
  attendances: any,
  // biome-ignore lint/suspicious/noExplicitAny: composed from loosely-typed endpoints
  fees: any,
): ActivityItem[] {
  const items: ActivityItem[] = [];
  const promo = graduation?.promotions?.[0];
  if (promo) {
    items.push({
      icon: Award01Icon,
      tone: "bg-primary/10 text-primary",
      title: promo.degree > 0 ? `Promovido para ${promo.degree}º grau` : `Faixa ${promo.beltName}`,
      meta: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
        new Date(promo.promotedAt),
      ),
      at: +new Date(promo.promotedAt),
    });
  }
  const att = attendances?.attendances?.find(
    (a: { invalidatedAt: string | null }) => !a.invalidatedAt,
  );
  if (att) {
    items.push({
      icon: CheckmarkCircle03Icon,
      tone: "bg-emerald-500/10 text-emerald-600",
      title: "Check-in confirmado",
      meta: `${att.classGroupName} · ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(att.createdAt))}`,
      at: +new Date(att.createdAt),
    });
  }
  const paid = fees?.fees?.find((f: { status: string }) => f.status === "paid");
  if (paid?.paidAt) {
    items.push({
      icon: Wallet01Icon,
      tone: "bg-muted text-muted-foreground",
      title: "Mensalidade paga",
      meta: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
        new Date(paid.paidAt),
      ),
      at: +new Date(paid.paidAt),
    });
  }
  return items.sort((a, b) => b.at - a.at).slice(0, 3);
}
