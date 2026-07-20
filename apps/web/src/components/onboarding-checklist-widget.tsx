import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { AcademyOnboardingChecklist } from "@tatamiq/contracts";
import { Check, Clock3, LockKeyhole, UsersRound, X } from "lucide-react";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import { DashboardCard } from "@/components/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { onboardingChecklistQueryKey } from "@/lib/academy-query-keys";
import { cn } from "@/lib/utils";

type ChecklistStepKey = keyof AcademyOnboardingChecklist["steps"];
type DerivedStepState = "completed" | "active" | "awaiting" | "blocked";

const checklistStepOrder: ChecklistStepKey[] = [
  "turmaCreated",
  "preRegistrationLinkShared",
  "firstPreRegistrationApproved",
  "firstAccessLinkSent",
];

const checklistStepCopy: Record<ChecklistStepKey, { title: string; description: string }> = {
  turmaCreated: {
    title: "Crie a primeira turma",
    description: "Organize o primeiro horário da Academia para começar a operar.",
  },
  preRegistrationLinkShared: {
    title: "Compartilhe o link de pré-cadastro",
    description: "Envie o link público para começar a receber interessados.",
  },
  firstPreRegistrationApproved: {
    title: "Aprove o primeiro pré-cadastro",
    description: "Transforme o primeiro interessado em Aluno da Academia.",
  },
  firstAccessLinkSent: {
    title: "Envie o primeiro acesso do aluno",
    description: "Libere o acesso do aluno aprovado ao portal do Tatamiq.",
  },
};

const stateCopy: Record<DerivedStepState, string> = {
  completed: "Concluído",
  active: "Ativo",
  awaiting: "Aguardando",
  blocked: "Bloqueado",
};

export function deriveOnboardingChecklistStepState(
  checklist: AcademyOnboardingChecklist,
  step: ChecklistStepKey,
): DerivedStepState {
  if (checklist.steps[step]) return "completed";

  if (step === "turmaCreated") return "active";

  if (step === "preRegistrationLinkShared") {
    return checklist.steps.turmaCreated ? "active" : "blocked";
  }

  if (step === "firstPreRegistrationApproved") {
    if (!checklist.steps.turmaCreated) return "blocked";
    return "awaiting";
  }

  if (!checklist.steps.firstPreRegistrationApproved) return "blocked";
  return checklist.firstAccessStudentId ? "active" : "awaiting";
}

export function countCompletedOnboardingSteps(checklist: AcademyOnboardingChecklist) {
  return checklistStepOrder.filter((step) => checklist.steps[step]).length;
}

export function shouldHideOnboardingChecklist(checklist: AcademyOnboardingChecklist) {
  return (
    checklist.dismissed || countCompletedOnboardingSteps(checklist) === checklistStepOrder.length
  );
}

export function OnboardingChecklistWidget() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;

  const checklistQuery = useQuery({
    queryKey: onboardingChecklistQueryKey(activeAcademyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/academy/onboarding-checklist");
      if (error || !data) {
        throw new Error("Não foi possível carregar a Configuração Inicial da Academia.");
      }
      return data;
    },
    enabled: !!activeAcademyId,
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/academy/onboarding-checklist/dismiss", {});
      if (error || !data) {
        throw new Error("Não foi possível ocultar a Configuração Inicial da Academia.");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingChecklistQueryKey(activeAcademyId), data);
    },
  });

  const checklist = checklistQuery.data;
  if (!checklist || shouldHideOnboardingChecklist(checklist)) return null;

  const completedSteps = countCompletedOnboardingSteps(checklist);
  const progress = Math.round((completedSteps / checklistStepOrder.length) * 100);

  return (
    <DashboardCard className="border-b border-border px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Configuração Inicial da Academia
          </p>
          <h2 className="text-lg font-semibold text-foreground">Coloque a Academia para rodar</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Acompanhe as primeiras ações essenciais para ativar a operação da Academia.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dispensar configuração inicial"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{completedSteps} de 4 concluídos</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {checklistStepOrder.map((step, index) => {
          const copy = checklistStepCopy[step];
          const state = deriveOnboardingChecklistStepState(checklist, step);
          const isPreRegistrationApprovalStep = step === "firstPreRegistrationApproved";
          const hasPendingPreRegistrations = checklist.pendingPreRegistrationCount > 0;

          return (
            <div
              key={step}
              className={cn(
                "rounded-2xl border border-border/70 bg-muted/30 px-4 py-4 transition-opacity",
                state === "blocked" && "opacity-55",
              )}
              data-step-state={state}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      state === "completed"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : state === "active"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : state === "awaiting"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {state === "completed" ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : state === "awaiting" && isPreRegistrationApprovalStep ? (
                      <Clock3 className="size-4" aria-hidden="true" />
                    ) : state === "blocked" ? (
                      <LockKeyhole className="size-3.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{copy.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
                    {isPreRegistrationApprovalStep && state === "awaiting" ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {hasPendingPreRegistrations ? (
                          <>
                            <Badge variant="warning" className="gap-1.5">
                              <UsersRound className="size-3.5" aria-hidden="true" />
                              {checklist.pendingPreRegistrationCount} em análise
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                void navigate({
                                  to: "/students",
                                  search: { tab: "pre-registrations" },
                                })
                              }
                            >
                              Revisar solicitações
                            </Button>
                          </>
                        ) : (
                          <Badge variant="warning" className="gap-1.5">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            Aguardando solicitação
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                {!isPreRegistrationApprovalStep || state !== "awaiting" ? (
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {stateCopy[state]}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
