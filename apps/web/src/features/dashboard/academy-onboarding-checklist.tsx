import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { AcademyOnboardingChecklist } from "@tatamiq/contracts";
import {
  Cancel01Icon,
  CheckListIcon,
  Copy01Icon,
  PartyIcon,
  PlusSignIcon,
  SquareLock01Icon,
  Tick01Icon,
  Time02Icon,
  UserMultiple02Icon,
} from "hugeicons-react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { cn } from "../../lib/utils";

type ChecklistStepKey = keyof AcademyOnboardingChecklist["steps"];
type StepState = "completed" | "active" | "awaiting" | "blocked";

const STEP_ORDER: ChecklistStepKey[] = [
  "turmaCreated",
  "preRegistrationLinkShared",
  "firstPreRegistrationApproved",
  "firstAccessLinkSent",
];

const STEP_COPY: Record<ChecklistStepKey, { title: string; description: string }> = {
  turmaCreated: {
    title: "Criar primeira turma",
    description: "Organize o primeiro horário da Academia para começar a operar.",
  },
  preRegistrationLinkShared: {
    title: "Compartilhar Link de Pré-Cadastro da Academia",
    description: "Envie o link público para começar a receber interessados.",
  },
  firstPreRegistrationApproved: {
    title: "Aprovar primeira solicitação",
    description: "Transforme o primeiro interessado em aluno da Academia.",
  },
  firstAccessLinkSent: {
    title: "Enviar Link de Primeiro Acesso",
    description: "Libere o acesso do aluno aprovado ao portal do Tatamiq.",
  },
};

export function academyOnboardingChecklistQueryKey(academyId: string | null | undefined) {
  return academyQueryKey(academyId, "onboarding-checklist");
}

export function deriveOnboardingChecklistStepState(
  checklist: AcademyOnboardingChecklist,
  step: ChecklistStepKey,
): StepState {
  if (checklist.steps[step]) return "completed";
  if (step === "turmaCreated") return "active";
  if (step === "preRegistrationLinkShared") {
    return checklist.steps.turmaCreated ? "active" : "blocked";
  }
  if (step === "firstPreRegistrationApproved") {
    return checklist.steps.turmaCreated ? "awaiting" : "blocked";
  }
  if (!checklist.steps.firstPreRegistrationApproved) return "blocked";
  return checklist.firstAccessStudentId ? "active" : "awaiting";
}

export function countCompletedOnboardingSteps(checklist: AcademyOnboardingChecklist) {
  return STEP_ORDER.filter((step) => checklist.steps[step]).length;
}

export function allStepsDone(checklist: AcademyOnboardingChecklist): boolean {
  return STEP_ORDER.every((step) => checklist.steps[step]);
}

export function useAcademyOnboardingChecklistQuery() {
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const queryKey = academyOnboardingChecklistQueryKey(activeAcademyId);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/academy/onboarding-checklist");
      if (error || !data) throw new Error("Não foi possível carregar a configuração inicial.");
      return data as AcademyOnboardingChecklist;
    },
    enabled: !!activeAcademyId,
  });

  return { activeAcademyId, query, queryKey };
}

export function shouldFocusDashboardOnboarding(
  checklist: AcademyOnboardingChecklist | null | undefined,
): boolean {
  return Boolean(checklist && !checklist.dismissed);
}

export function AcademyOnboardingChecklistWidget({ centered = false }: { centered?: boolean }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { query, queryKey } = useAcademyOnboardingChecklistQuery();

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/academy/onboarding-checklist/dismiss", {});
      if (error || !data) throw new Error("Não foi possível ocultar a configuração inicial.");
      return data as AcademyOnboardingChecklist;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
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
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível copiar o link.");
    },
  });

  const copyFirstAccessMutation = useMutation({
    mutationFn: async () => {
      const studentId = query.data?.firstAccessStudentId;
      if (!studentId) throw new Error("Aluno aprovado não encontrado.");
      const { data, error } = await api.POST("/students/{id}/first-access-link", {
        params: { path: { id: studentId } },
      });
      if (error || !data) throw new Error("Não foi possível gerar o link de primeiro acesso.");
      await navigator.clipboard.writeText(data.firstAccessLink);
      return data.firstAccessLink;
    },
    onSuccess: async () => {
      toast.success("Link de primeiro acesso copiado.");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível copiar o link.");
    },
  });

  const checklist = query.data;
  if (!checklist || checklist.dismissed) return null;

  const card = (
    <AcademyOnboardingChecklistCard
      checklist={checklist}
      copying={copyLinkMutation.isPending}
      copyingFirstAccessLink={copyFirstAccessMutation.isPending}
      dismissing={dismissMutation.isPending}
      onCopyLink={() => copyLinkMutation.mutate()}
      onCopyFirstAccessLink={() => copyFirstAccessMutation.mutate()}
      onCreateTurma={() => void navigate({ to: "/class-groups", search: { create: "turma" } })}
      onReviewPreRegistrations={() =>
        void navigate({ to: "/students", search: { tab: "pre-registrations" } })
      }
      onDismiss={() => dismissMutation.mutate()}
    />
  );

  if (!centered) return card;

  return <div className="w-full max-w-5xl">{card}</div>;
}

type ChecklistCardProps = {
  checklist: AcademyOnboardingChecklist;
  copying?: boolean;
  copyingFirstAccessLink?: boolean;
  dismissing?: boolean;
  onCopyLink: () => void;
  onCopyFirstAccessLink?: () => void;
  onCreateTurma?: () => void;
  onReviewPreRegistrations?: () => void;
  onDismiss: () => void;
};

export function AcademyOnboardingChecklistCard({
  checklist,
  copying,
  copyingFirstAccessLink,
  dismissing,
  onCopyLink,
  onCopyFirstAccessLink,
  onCreateTurma,
  onReviewPreRegistrations,
  onDismiss,
}: ChecklistCardProps) {
  const completed = countCompletedOnboardingSteps(checklist);
  const progress = Math.round((completed / STEP_ORDER.length) * 100);
  const complete = allStepsDone(checklist);

  return (
    <section className="rounded-[18px] border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary-strong">
            {complete ? "Configuração concluída" : "Configuração inicial"}
          </p>
          <h2 className="text-lg font-semibold text-foreground">Coloque a Academia para rodar</h2>
          <p className="text-sm text-muted-foreground">
            {complete
              ? "Você concluiu todos os passos iniciais da Academia."
              : "Complete os primeiros passos para começar a receber alunos pelo pré-cadastro."}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Ocultar configuração inicial"
          onClick={onDismiss}
          disabled={dismissing}
        >
          <Cancel01Icon className="size-4" />
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{completed} de 4 concluídos</span>
          <span
            className={cn("text-muted-foreground", complete && "font-semibold text-primary-strong")}
          >
            {progress}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 grid gap-2.5">
        {STEP_ORDER.map((step, index) => (
          <ChecklistStepRow
            key={step}
            step={step}
            index={index}
            state={deriveOnboardingChecklistStepState(checklist, step)}
            pendingPreRegistrationCount={checklist.pendingPreRegistrationCount}
            copying={copying}
            copyingFirstAccessLink={copyingFirstAccessLink}
            onCopyLink={onCopyLink}
            onCopyFirstAccessLink={onCopyFirstAccessLink}
            onCreateTurma={onCreateTurma}
            onReviewPreRegistrations={onReviewPreRegistrations}
          />
        ))}
      </ol>

      {complete ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary-soft-border bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <PartyIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Academia pronta para operar
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-primary-soft-foreground">
                Você já pode receber interessados, aprovar alunos e entregar o primeiro acesso.
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

type StepRowProps = {
  step: ChecklistStepKey;
  index: number;
  state: StepState;
  pendingPreRegistrationCount: number;
  copying?: boolean | undefined;
  copyingFirstAccessLink?: boolean | undefined;
  onCopyLink: () => void;
  onCopyFirstAccessLink?: (() => void) | undefined;
  onCreateTurma?: (() => void) | undefined;
  onReviewPreRegistrations?: (() => void) | undefined;
};

function ChecklistStepRow({
  step,
  index,
  state,
  pendingPreRegistrationCount,
  copying,
  copyingFirstAccessLink,
  onCopyLink,
  onCopyFirstAccessLink,
  onCreateTurma,
  onReviewPreRegistrations,
}: StepRowProps) {
  const copy = STEP_COPY[step];
  const actionable = state === "active" || state === "awaiting";
  const hasPending = pendingPreRegistrationCount > 0;
  const showDescription = state !== "completed";
  const inlineBadge =
    step === "firstPreRegistrationApproved" && state === "awaiting" && hasPending ? (
      <Badge variant="warning" className="mt-2 gap-1.5">
        <UserMultiple02Icon className="size-3.5" aria-hidden="true" />
        {pendingPreRegistrationCount} em análise
      </Badge>
    ) : null;

  return (
    <li
      data-step-state={state}
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl p-3.5 transition-colors",
        actionable ? "border border-primary/40 bg-card" : "bg-muted/40",
        state === "blocked" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <StepIndicator index={index} state={state} />
        <div className="space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              state === "blocked" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {copy.title}
          </p>
          {showDescription ? (
            <p className="text-sm leading-5 text-muted-foreground">{copy.description}</p>
          ) : null}
          {inlineBadge}
        </div>
      </div>
      <StepAction
        step={step}
        state={state}
        hasPending={hasPending}
        copying={copying}
        copyingFirstAccessLink={copyingFirstAccessLink}
        onCopyLink={onCopyLink}
        onCopyFirstAccessLink={onCopyFirstAccessLink}
        onCreateTurma={onCreateTurma}
        onReviewPreRegistrations={onReviewPreRegistrations}
      />
    </li>
  );
}

function StepIndicator({ index, state }: { index: number; state: StepState }) {
  const base = "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold";
  if (state === "completed") {
    return (
      <span className={cn(base, "bg-green-500/15 text-green-700 dark:text-green-400")}>
        <Tick01Icon className="size-4" aria-hidden="true" />
      </span>
    );
  }
  if (state === "active") {
    return <span className={cn(base, "bg-primary text-primary-foreground")}>{index + 1}</span>;
  }
  if (state === "awaiting") {
    return (
      <span className={cn(base, "bg-amber-500/15 text-amber-700 dark:text-amber-400")}>
        <Time02Icon className="size-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-muted text-muted-foreground")}>
      <SquareLock01Icon className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function StepAction({
  step,
  state,
  hasPending,
  copying,
  copyingFirstAccessLink,
  onCopyLink,
  onCopyFirstAccessLink,
  onCreateTurma,
  onReviewPreRegistrations,
}: {
  step: ChecklistStepKey;
  state: StepState;
  hasPending: boolean;
  copying?: boolean | undefined;
  copyingFirstAccessLink?: boolean | undefined;
  onCopyLink: () => void;
  onCopyFirstAccessLink?: (() => void) | undefined;
  onCreateTurma?: (() => void) | undefined;
  onReviewPreRegistrations?: (() => void) | undefined;
}) {
  if (state === "completed") {
    return (
      <Badge variant="success" size="sm" className="shrink-0">
        Concluído
      </Badge>
    );
  }
  if (state === "blocked") {
    return (
      <Badge variant="muted" size="sm" className="shrink-0">
        Bloqueado
      </Badge>
    );
  }

  if (step === "turmaCreated" && state === "active") {
    return (
      <Button type="button" size="sm" className="shrink-0" onClick={onCreateTurma}>
        <PlusSignIcon className="size-3.5" /> Criar turma
      </Button>
    );
  }
  if (step === "preRegistrationLinkShared" && state === "active") {
    return (
      <Button type="button" size="sm" className="shrink-0" onClick={onCopyLink} disabled={copying}>
        <Copy01Icon className="size-3.5" /> {copying ? "Copiando..." : "Copiar link"}
      </Button>
    );
  }
  if (step === "firstPreRegistrationApproved" && state === "awaiting") {
    if (hasPending) {
      return (
        <Button type="button" size="sm" className="shrink-0" onClick={onReviewPreRegistrations}>
          <CheckListIcon className="size-3.5" /> Revisar solicitações
        </Button>
      );
    }
    return (
      <Badge variant="warning" size="sm" className="shrink-0">
        Aguardando
      </Badge>
    );
  }
  if (step === "firstAccessLinkSent" && state === "active") {
    return (
      <Button
        type="button"
        size="sm"
        className="shrink-0"
        onClick={onCopyFirstAccessLink}
        disabled={copyingFirstAccessLink}
      >
        <Copy01Icon className="size-3.5" />{" "}
        {copyingFirstAccessLink ? "Copiando..." : "Copiar link de acesso"}
      </Button>
    );
  }
  return (
    <Badge variant="warning" size="sm" className="shrink-0">
      Aguardando
    </Badge>
  );
}
