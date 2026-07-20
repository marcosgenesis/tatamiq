import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcademyOnboardingChecklist } from "@tatamiq/contracts";
import { Copy01Icon, Tick01Icon } from "hugeicons-react";
import { PartyPopper, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { academyQueryKey } from "../../lib/academy-query-keys";

export function academyOnboardingChecklistQueryKey(academyId: string | null | undefined) {
  return academyQueryKey(academyId, "onboarding-checklist");
}

export function AcademyOnboardingChecklistWidget() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;

  const query = useQuery({
    queryKey: academyOnboardingChecklistQueryKey(activeAcademyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/academy/onboarding-checklist");
      if (error || !data) throw new Error("Não foi possível carregar a configuração inicial.");
      return data as AcademyOnboardingChecklist;
    },
    enabled: !!activeAcademyId,
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/academy/onboarding-checklist/dismiss", {});
      if (error || !data) throw new Error("Não foi possível ocultar a configuração inicial.");
      return data as AcademyOnboardingChecklist;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(academyOnboardingChecklistQueryKey(activeAcademyId), data);
    },
  });

  const copyLinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/students/pre-registration-link/copy");
      if (error || !data?.url) throw new Error("Não foi possível copiar o link.");
      await navigator.clipboard.writeText(data.url);
      return data;
    },
    onSuccess: async () => {
      toast.success("Link de pré-cadastro copiado.");
      await queryClient.invalidateQueries({
        queryKey: academyOnboardingChecklistQueryKey(activeAcademyId),
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível copiar o link.");
    },
  });

  const checklist = query.data;
  if (!checklist || checklist.dismissed) return null;

  return (
    <AcademyOnboardingChecklistCard
      checklist={checklist}
      copying={copyLinkMutation.isPending}
      dismissing={dismissMutation.isPending}
      onCopyLink={() => copyLinkMutation.mutate()}
      onDismiss={() => dismissMutation.mutate()}
    />
  );
}

export function AcademyOnboardingChecklistCard({
  checklist,
  copying,
  dismissing,
  onCopyLink,
  onDismiss,
}: {
  checklist: AcademyOnboardingChecklist;
  copying?: boolean;
  dismissing?: boolean;
  onCopyLink: () => void;
  onDismiss: () => void;
}) {
  const steps = [
    { key: "turmaCreated", label: "Criar primeira turma" },
    { key: "preRegistrationLinkShared", label: "Compartilhar Link de Pré-Cadastro da Academia" },
    { key: "firstPreRegistrationApproved", label: "Aprovar primeira solicitação" },
    { key: "firstAccessLinkSent", label: "Enviar Link de Primeiro Acesso" },
  ] as const;
  const completed = steps.filter((step) => checklist.steps[step.key]).length;
  const complete = allStepsDone(checklist);
  const step1Done = checklist.steps.turmaCreated;
  const step2Done = checklist.steps.preRegistrationLinkShared;
  const step2Blocked = !step1Done;

  return (
    <section className="rounded-[18px] border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Configuração Inicial da Academia
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Prepare sua academia para receber pré-cadastros
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{completed} de 4 concluídos</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={dismissing}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Ocultar configuração inicial"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(completed / 4) * 100}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-2">
        {steps.map((step, index) => {
          const done = checklist.steps[step.key];
          const isStep2 = step.key === "preRegistrationLinkShared";
          const previousStep = index > 0 ? steps[index - 1] : undefined;
          const blocked = isStep2
            ? step2Blocked
            : previousStep
              ? !checklist.steps[previousStep.key]
              : false;
          return (
            <li
              key={step.key}
              className={`flex items-center justify-between gap-3 rounded-[14px] border px-3 py-2 ${
                blocked ? "border-border bg-muted/30 opacity-55" : "border-border bg-background"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                    done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Tick01Icon className="size-4" /> : index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{step.label}</span>
              </div>
              {isStep2 && !step2Done ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onCopyLink}
                  disabled={step2Blocked || copying}
                >
                  <Copy01Icon className="size-4" /> Copiar link
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>

      {complete ? (
        <div className="mt-4 flex flex-col gap-3 rounded-[16px] border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <PartyPopper className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Academia pronta para operar
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Os primeiros passos foram concluídos. Sua academia já pode receber interessados,
                aprovar alunos e entregar o primeiro acesso sem depender deste guia.
              </p>
            </div>
          </div>
          <Button type="button" className="shrink-0" onClick={onDismiss} disabled={dismissing}>
            {dismissing ? "Fechando..." : "Fechar guia"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function allStepsDone(checklist: AcademyOnboardingChecklist): boolean {
  return Object.values(checklist.steps).every(Boolean);
}
