import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { StudentGraduationResponse } from "@tatamiq/contracts";
import { ArrowLeft01Icon, ChampionIcon, Tick02Icon } from "hugeicons-react";
import { api } from "../../../api";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { BeltVisual } from "../components/belt-visual";
import { BELT_ORDER, beltProgress } from "../lib/belt-progress";
import { toGraduationInput } from "../lib/graduation-response";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function StudentGraduationScreen() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["student", "graduation"],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/graduation");
      if (error || !data) throw new Error("Não foi possível carregar graduação.");
      return data satisfies StudentGraduationResponse;
    },
  });

  const graduation = query.data ? toGraduationInput(query.data) : null;
  const belt = graduation ? beltProgress(graduation) : null;
  const promotions = (graduation?.promotions ?? [])
    .slice()
    .sort((a, b) => +new Date(b.promotedAt) - +new Date(a.promotedAt));

  return (
    <div>
      <header className="rounded-b-[1.75rem] bg-neutral-900 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-7 text-white">
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => navigate({ to: "/student" })}
            className="-ml-1 grid size-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/15"
          >
            <ArrowLeft01Icon className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-[1.45rem] font-bold tracking-tight">Graduação</h1>
        </div>

        {belt ? (
          <div className="mt-5">
            <BeltVisual
              beltKey={belt.beltKey}
              degrees={belt.degree}
              size="hero"
              imagePath={query.data?.currentBelt?.path}
            />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-[1.15rem] font-bold">Faixa {belt.beltName}</p>
                <p className="text-[0.78rem] font-medium text-white/55">
                  {belt.timeOnBelt ? `Desde ${belt.timeOnBelt}` : "Início da jornada · entrou hoje"}
                </p>
              </div>
              <span className="rounded-full bg-primary/20 px-3 py-1.5 text-[0.78rem] font-bold text-[#ff7a3d]">
                {belt.degree} {belt.degree === 1 ? "grau" : "graus"}
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/55">Próximo: {belt.nextLabel}</span>
              <span className="text-xs font-bold">
                {belt.monthsRemaining > 0 ? `~${belt.monthsRemaining} meses` : "Pronto"}
              </span>
            </div>
            <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.max(4, Math.round(belt.progress * 100))}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-[42px] w-full rounded-md bg-white/10" />
            <Skeleton className="h-5 w-40 bg-white/10" />
          </div>
        )}
      </header>

      <div className="space-y-6 p-5">
        {/* Journey */}
        <section>
          <h2 className="mb-3 font-heading text-[0.95rem] font-bold tracking-tight">Sua jornada</h2>
          <div className="flex items-start justify-between">
            {BELT_ORDER.map((b, i) => {
              const current = belt?.journeyIndex === i;
              const reached = (belt?.journeyIndex ?? 0) >= i;
              return (
                <div key={b.key} className="flex flex-1 flex-col items-center gap-2">
                  <span
                    className={cn(
                      "grid place-items-center rounded-full",
                      current
                        ? "size-9 ring-[3px] ring-primary ring-offset-2 ring-offset-background"
                        : "size-[1.6rem]",
                    )}
                    style={{ backgroundColor: b.color, opacity: reached ? 1 : 0.4 }}
                  >
                    {current ? (
                      <Tick02Icon className="size-[1.05rem] text-white" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-[0.65rem]",
                      current ? "font-bold text-foreground" : "font-medium text-muted-foreground",
                    )}
                  >
                    {b.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={String(belt?.degree ?? 0)} label="graus" />
          <Stat value={String(promotions.length)} label="promoções" />
          <Stat value={String((belt?.journeyIndex ?? 0) + 1)} label="faixas" />
        </div>

        {/* Timeline */}
        <section>
          <h2 className="mb-3 font-heading text-[0.95rem] font-bold tracking-tight">
            Linha do tempo
          </h2>
          {promotions.length > 0 ? (
            <ol className="space-y-0">
              {promotions.map((promo, i) => {
                const last = i === promotions.length - 1;
                const color = BELT_ORDER.find(
                  (b) => b.name.toLowerCase() === promo.beltName.toLowerCase(),
                )?.color;
                return (
                  <li
                    key={`${promo.beltName}-${promo.degree}-${promo.promotedAt}`}
                    className="flex gap-3.5"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className="mt-0.5 size-4 shrink-0 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: color ?? "#5b21b6" }}
                      />
                      {!last ? <span className="w-0.5 flex-1 bg-border" /> : null}
                    </div>
                    <div className={cn("min-w-0", last ? "pb-0" : "pb-5")}>
                      <p className="text-sm font-bold">
                        {promo.degree > 0
                          ? `${promo.degree}º grau · ${promo.beltName}`
                          : `Faixa ${promo.beltName}`}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {DATE_FMT.format(new Date(promo.promotedAt))}
                      </p>
                      {promo.notes ? (
                        <p className="mt-2 rounded-xl bg-muted px-3 py-2.5 text-[0.8rem] font-medium leading-relaxed text-muted-foreground">
                          {promo.notes}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-9 text-center">
              <span className="mb-1 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <ChampionIcon className="size-6" aria-hidden="true" />
              </span>
              <p className="text-[0.95rem] font-bold">Sua linha do tempo começa agora</p>
              <p className="max-w-[17rem] text-xs font-medium text-muted-foreground">
                Cada grau e faixa que você conquistar vai aparecer aqui. Bons treinos!
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-3 py-4">
      <span className="text-[1.3rem] font-bold leading-none">{value}</span>
      <span className="text-[0.7rem] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
