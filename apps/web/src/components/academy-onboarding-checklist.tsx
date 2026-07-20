import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { useAppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { academyQueryKey } from "@/lib/academy-query-keys";
import { cn } from "@/lib/utils";

type Step4State = {
  firstPreRegistrationApproved: boolean;
  firstAccessLinkSent: boolean;
  firstAccessStudentId: string | null;
};

export function AcademyOnboardingChecklist() {
  const { activeAcademy } = useAppShell();
  const academyId = activeAcademy.id;
  const queryKey = academyQueryKey(academyId, "onboarding-checklist");

  const checklistQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/academy/onboarding-checklist");
      if (error) throw new Error("Não foi possível carregar a configuração inicial.");
      return data;
    },
  });

  const checklist = checklistQuery.data;
  if (!checklist || checklist.dismissed) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.03] shadow-sm md:col-span-2 lg:col-span-4">
      <CardHeader>
        <CardTitle>Configuração Inicial da Academia</CardTitle>
        <CardDescription>
          Complete os primeiros passos para receber o primeiro aluno pelo pré-cadastro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingFirstAccessStep
          firstAccessLinkSent={checklist.steps.firstAccessLinkSent}
          firstAccessStudentId={checklist.firstAccessStudentId}
          firstPreRegistrationApproved={checklist.steps.firstPreRegistrationApproved}
          onCopied={() => void checklistQuery.refetch()}
          queryKey={queryKey}
        />
      </CardContent>
    </Card>
  );
}

export function OnboardingFirstAccessStep({
  firstPreRegistrationApproved,
  firstAccessLinkSent,
  firstAccessStudentId,
  onCopied,
  queryKey,
}: Step4State & { onCopied?: () => void; queryKey?: readonly unknown[] }) {
  const queryClient = useQueryClient();
  const blocked = !firstPreRegistrationApproved;
  const done = firstAccessLinkSent;
  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!firstAccessStudentId) throw new Error("Aluno aprovado não encontrado.");
      const { data, error } = await api.POST("/students/{id}/first-access-link", {
        params: { path: { id: firstAccessStudentId } },
      });
      if (error) throw new Error("Não foi possível gerar o link de primeiro acesso.");
      await navigator.clipboard.writeText(data.firstAccessLink);
      return data.firstAccessLink;
    },
    onSuccess: async () => {
      toast.success("Link de primeiro acesso copiado.");
      if (queryKey) await queryClient.invalidateQueries({ queryKey });
      onCopied?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível copiar o link.");
    },
  });

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between",
        blocked && "opacity-55",
        done && "border-emerald-200 bg-emerald-50/60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
            done
              ? "border-emerald-300 bg-emerald-100 text-emerald-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <CheckCircle2 className="size-4" /> : <LockKeyhole className="size-4" />}
        </span>
        <div className="space-y-1">
          <h3 className="font-medium text-foreground">Enviar Link de Primeiro Acesso</h3>
          <p className="max-w-2xl text-muted-foreground text-sm">
            {done
              ? "Link copiado. O aluno já pode receber o acesso inicial."
              : blocked
                ? "Aprove uma Solicitação de Pré-Cadastro para liberar este passo."
                : "Copie o link do aluno aprovado e envie por WhatsApp ou outro canal externo."}
          </p>
        </div>
      </div>
      {!done && !blocked ? (
        <Button
          className="shrink-0"
          disabled={copyMutation.isPending || !firstAccessStudentId}
          onClick={() => copyMutation.mutate()}
          type="button"
        >
          <Copy className="size-4" />
          {copyMutation.isPending ? "Copiando..." : "Copiar link de acesso"}
        </Button>
      ) : null}
    </div>
  );
}
