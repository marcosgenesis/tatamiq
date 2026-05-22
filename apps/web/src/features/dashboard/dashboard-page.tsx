import {
  Alert02Icon,
  CheckmarkBadge02Icon,
  GraduationScrollIcon,
  Money03Icon,
  UserAdd02Icon,
} from "hugeicons-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { TodayRoutineCard, TodayScheduleCard } from "../schedule/schedule-page";

const cards = [
  {
    title: "Pagamentos em verificação",
    value: "4",
    description: "Comprovantes aguardando revisão",
    icon: CheckmarkBadge02Icon,
    tone: "warning" as const,
  },
  {
    title: "Mensalidades atrasadas",
    value: "8",
    description: "Alunos com pendência aberta",
    icon: Alert02Icon,
    tone: "muted" as const,
  },
  {
    title: "Elegíveis para graduação",
    value: "12",
    description: "Separados por grau e faixa",
    icon: GraduationScrollIcon,
    tone: "default" as const,
  },
  {
    title: "Convites pendentes",
    value: "6",
    description: "Inclui convites expirados",
    icon: UserAdd02Icon,
    tone: "muted" as const,
  },
];

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge variant="warning">Academia Demo · Instrutor</Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">Painel</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Uma visão operacional do tatame: aulas do dia, pendências financeiras, evolução dos
            alunos e convites que precisam de atenção.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TodayScheduleCard />
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="group overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle className="text-4xl">{card.value}</CardTitle>
                  </div>
                  <div className="grid size-11 place-items-center rounded-2xl border border-border bg-muted text-primary transition-transform group-hover:-rotate-6 group-hover:scale-105">
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant={card.tone}>{card.description}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <TodayRoutineCard />

        <Card>
          <CardHeader>
            <CardDescription>Financeiro</CardDescription>
            <CardTitle>Pix manual na V0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/45 p-4">
              <Money03Icon className="size-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Comprovantes enviados pelos alunos aparecem na fila de verificação do instrutor.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
