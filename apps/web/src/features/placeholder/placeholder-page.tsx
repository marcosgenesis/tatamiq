import type { ComponentType } from "react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function PlaceholderPage(props: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const Icon = props.icon;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Módulo V0</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{props.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {props.description}
            </p>
          </div>
          <div className="grid size-14 place-items-center rounded-3xl border border-border bg-muted text-primary">
            <Icon className="size-7" />
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Placeholder</CardDescription>
          <CardTitle>Esta tela será implementada na próxima fatia funcional.</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            A rota já existe para validar navegação, layout responsivo e estrutura do produto antes
            de conectar dados reais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
