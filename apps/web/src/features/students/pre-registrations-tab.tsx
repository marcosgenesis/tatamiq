import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PreRegistrationRequest } from "@tatamiq/contracts";
import {
  Alert01Icon,
  Copy01Icon,
  Link04Icon,
  Mail01Icon,
  RefreshIcon,
  Tick01Icon,
} from "hugeicons-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { formatDate } from "../../lib/formatting";

type DuplicateDecision = "link_to_existing" | "create_new" | "reject_as_duplicate";

export function PreRegistrationsTab() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    requestId: string;
    firstAccessLink: string;
  } | null>(null);

  const linkQuery = useQuery({
    queryKey: ["students", "pre-registration-link"],
    queryFn: async () => {
      const { data, error } = await api.GET("/students/pre-registration-link");
      if (error) throw new Error("Não foi possível carregar o link.");
      return data;
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["students", "pre-registrations"],
    queryFn: async () => {
      const { data, error } = await api.GET("/students/pre-registrations");
      if (error) throw new Error("Não foi possível carregar pré-cadastros.");
      return data;
    },
  });

  const linkActionMutation = useMutation({
    mutationFn: async (action: "pause" | "reactivate" | "regenerate") => {
      const path =
        action === "pause"
          ? "/students/pre-registration-link/pause"
          : action === "reactivate"
            ? "/students/pre-registration-link/reactivate"
            : "/students/pre-registration-link/regenerate";
      // biome-ignore lint/suspicious/noExplicitAny: dynamic endpoint path
      const { error } = await (api.POST as any)(path);
      if (error) throw new Error("Não foi possível atualizar o link.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["students", "pre-registration-link"],
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await api.POST("/students/pre-registrations/{id}/reject", {
        params: { path: { id } },
        body: { reason },
      });
      if (error) throw new Error("Não foi possível rejeitar a solicitação.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["students", "pre-registrations"],
      });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      duplicateDecision,
    }: {
      id: string;
      duplicateDecision?: DuplicateDecision;
    }) => {
      const { data, error } = await api.POST("/students/pre-registrations/{id}/approve", {
        params: { path: { id } },
        body: duplicateDecision ? { duplicateDecision } : {},
      });
      if (error) throw new Error("Não foi possível aprovar a solicitação.");
      return data;
    },
    onSuccess: async (data, variables) => {
      if (data?.firstAccessLink) {
        setApprovalResult({
          requestId: variables.id,
          firstAccessLink: data.firstAccessLink,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["students", "pre-registrations"],
      });
      setApprovingId(null);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.POST("/students/pre-registrations/{id}/send-first-access-email", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível enviar o email.");
    },
    onSuccess: () => {
      toast("Email enviado com sucesso");
    },
    onError: () => {
      toast.error("Falha ao enviar email");
    },
  });

  const link = linkQuery.data;
  const requests = requestsQuery.data?.requests ?? [];

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link.url);
    toast("Link de pré-cadastro copiado", { description: link.url });
  }

  function copyFirstAccessLink(url: string) {
    navigator.clipboard.writeText(url);
    toast("Link de primeiro acesso copiado");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link04Icon className="size-4" /> Link de pré-cadastro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando link...</p>
          ) : null}
          {link ? (
            <>
              <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm break-all">
                {link.url}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={link.status === "active" ? "default" : "muted"}>
                  {link.status === "active" ? "Ativo" : "Pausado"}
                </Badge>
                <Button type="button" variant="secondary" onClick={copyLink}>
                  <Copy01Icon className="size-4" /> Copiar
                </Button>
                {link.status === "active" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => linkActionMutation.mutate("pause")}
                  >
                    Pausar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => linkActionMutation.mutate("reactivate")}
                  >
                    Reativar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => linkActionMutation.mutate("regenerate")}
                >
                  <RefreshIcon className="size-4" /> Regenerar
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Solicitações</h2>
          {requestsQuery.data ? (
            <p className="text-sm text-muted-foreground">
              {requestsQuery.data.summary.pendingReview} em análise ·{" "}
              {requestsQuery.data.summary.rejected} rejeitadas
            </p>
          ) : null}
        </div>
        {requestsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando solicitações...</p>
        ) : null}
        {requests.length === 0 && !requestsQuery.isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum pré-cadastro recebido.
            </CardContent>
          </Card>
        ) : null}
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            rejecting={rejectingId === request.id}
            rejectReason={rejectReason}
            approving={approvingId === request.id}
            approvalResult={approvalResult?.requestId === request.id ? approvalResult : null}
            approvePending={approveMutation.isPending}
            sendEmailPending={sendEmailMutation.isPending}
            onStartReject={() => {
              setRejectingId(request.id);
              setRejectReason("");
            }}
            onCancelReject={() => setRejectingId(null)}
            onRejectReasonChange={setRejectReason}
            onReject={() =>
              rejectMutation.mutate({
                id: request.id,
                reason: rejectReason,
              })
            }
            onApprove={(decision) => {
              if (request.duplicateStudent && !decision) {
                setApprovingId(request.id);
                return;
              }
              approveMutation.mutate(
                decision ? { id: request.id, duplicateDecision: decision } : { id: request.id },
              );
            }}
            onCancelApprove={() => setApprovingId(null)}
            onCopyFirstAccess={copyFirstAccessLink}
            onSendEmail={() => sendEmailMutation.mutate(request.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function RequestCard(props: {
  request: PreRegistrationRequest;
  rejecting: boolean;
  rejectReason: string;
  approving: boolean;
  approvalResult: { firstAccessLink: string } | null;
  approvePending: boolean;
  sendEmailPending: boolean;
  onStartReject: () => void;
  onCancelReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onReject: () => void;
  onApprove: (decision?: DuplicateDecision) => void;
  onCancelApprove: () => void;
  onCopyFirstAccess: (url: string) => void;
  onSendEmail: () => void;
}) {
  const { request } = props;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <strong>{request.name}</strong>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(request.birthDate)} · {request.phone} · {request.email}
            </p>
            {request.guardianName ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Responsável: {request.guardianName} · {request.guardianPhone}
              </p>
            ) : null}
            {request.note ? <p className="mt-2 text-sm">"{request.note}"</p> : null}

            {request.isInstructorAccount ? (
              <p className="mt-2 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-sm text-orange-700 dark:text-orange-300">
                <Alert01Icon className="size-4 shrink-0" />
                Este email pertence a uma conta de instrutor.
              </p>
            ) : null}

            {request.duplicateStudent ? (
              <p className="mt-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-2 text-sm text-yellow-700 dark:text-yellow-300">
                Possível duplicidade com {request.duplicateStudent.name}.
                {request.duplicateStudentHasActiveAccess ? " (já possui acesso ativo)" : ""}
              </p>
            ) : null}

            {request.rejectionReason ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Motivo interno: {request.rejectionReason}
              </p>
            ) : null}
          </div>

          {request.status === "pending_review" ? (
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                disabled={props.approvePending}
                onClick={() => props.onApprove()}
              >
                <Tick01Icon className="size-4" />
                Aprovar
              </Button>
              <Button type="button" variant="ghost" onClick={props.onStartReject}>
                Rejeitar
              </Button>
            </div>
          ) : null}
        </div>

        {/* Approval result: copy first access link + send email */}
        {request.status === "approved" && props.approvalResult ? (
          <div className="space-y-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Aluno aprovado com sucesso!
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (props.approvalResult) {
                    props.onCopyFirstAccess(props.approvalResult.firstAccessLink);
                  }
                }}
              >
                <Copy01Icon className="size-4" /> Copiar link de primeiro acesso
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.sendEmailPending}
                onClick={props.onSendEmail}
              >
                <Mail01Icon className="size-4" />
                {props.sendEmailPending ? "Enviando..." : "Enviar por email"}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Duplicate decision modal */}
        {props.approving && request.duplicateStudent ? (
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-medium">
              Decisão de duplicata: {request.duplicateStudent.name}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={request.duplicateStudentHasActiveAccess || props.approvePending}
                onClick={() => props.onApprove("link_to_existing")}
              >
                Vincular ao aluno existente
                {request.duplicateStudentHasActiveAccess ? " (acesso ativo)" : ""}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={props.approvePending}
                onClick={() => props.onApprove("create_new")}
              >
                Criar aluno novo mesmo assim
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={props.approvePending}
                onClick={() => props.onApprove("reject_as_duplicate")}
              >
                Rejeitar como duplicata
              </Button>
              <Button type="button" variant="ghost" onClick={props.onCancelApprove}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Reject form */}
        {props.rejecting ? (
          <div className="space-y-2 rounded-2xl border border-border p-3">
            <Textarea
              value={props.rejectReason}
              onChange={(event) => props.onRejectReasonChange(event.target.value)}
              placeholder="Motivo interno opcional"
            />
            <div className="flex gap-2">
              <Button type="button" variant="destructive" onClick={props.onReject}>
                Confirmar rejeição
              </Button>
              <Button type="button" variant="secondary" onClick={props.onCancelReject}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge(props: { status: string }) {
  switch (props.status) {
    case "pending_review":
      return <Badge variant="warning">Em análise</Badge>;
    case "rejected":
      return <Badge variant="muted">Rejeitada</Badge>;
    case "approved":
      return <Badge variant="default">Aprovada</Badge>;
    default:
      return null;
  }
}
