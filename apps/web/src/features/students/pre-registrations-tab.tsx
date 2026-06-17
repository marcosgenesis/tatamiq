import type { PreRegistrationRequest } from "@tatamiq/contracts";
import {
  Alert01Icon,
  Copy01Icon,
  Link04Icon,
  Mail01Icon,
  RefreshIcon,
  Tick01Icon,
} from "hugeicons-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { formatDate } from "../../lib/formatting";
import { type DuplicateDecision, usePreRegistrationsWorkflow } from "./pre-registrations-workflow";

export function PreRegistrationsTab() {
  const workflow = usePreRegistrationsWorkflow();
  const { link, linkQuery, requests, requestsQuery } = workflow;

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
                <Button type="button" variant="secondary" onClick={workflow.copyLink}>
                  <Copy01Icon className="size-4" /> Copiar
                </Button>
                {link.status === "active" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => workflow.submitLinkAction("pause")}
                  >
                    Pausar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => workflow.submitLinkAction("reactivate")}
                  >
                    Reativar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => workflow.submitLinkAction("regenerate")}
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
              {requestsQuery.data.summary.approved} aprovadas ·{" "}
              {requestsQuery.data.summary.rejected} rejeitadas
            </p>
          ) : null}
        </div>
        {requestsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando solicitações...</p>
        ) : null}
        {requestsQuery.isError ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              {requestsQuery.error instanceof Error
                ? requestsQuery.error.message
                : "Não foi possível carregar pré-cadastros."}
            </CardContent>
          </Card>
        ) : null}
        {!requestsQuery.isError && requests.length === 0 && !requestsQuery.isLoading ? (
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
            rejecting={workflow.rejectingId === request.id}
            rejectReason={workflow.rejectReason}
            approving={workflow.approvingId === request.id}
            approvalResult={
              workflow.approvalResult?.requestId === request.id ? workflow.approvalResult : null
            }
            approvePending={workflow.approvePending}
            generateFirstAccessLinkPending={workflow.generateFirstAccessLinkPending}
            sendEmailPending={workflow.sendEmailPending}
            onStartReject={() => workflow.startReject(request.id)}
            onCancelReject={workflow.cancelReject}
            onRejectReasonChange={workflow.setRejectReason}
            onReject={() => workflow.submitReject(request.id)}
            onApprove={(decision) =>
              workflow.submitApprove({
                requestId: request.id,
                hasDuplicate: !!request.duplicateStudent,
                duplicateDecision: decision,
              })
            }
            onCancelApprove={workflow.cancelApprove}
            onCopyFirstAccess={workflow.copyFirstAccessLink}
            onGenerateFirstAccessLink={() => workflow.generateFirstAccessLink(request.id)}
            onSendEmail={() => workflow.sendFirstAccessEmail(request.id)}
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
  generateFirstAccessLinkPending: boolean;
  sendEmailPending: boolean;
  onStartReject: () => void;
  onCancelReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onReject: () => void;
  onApprove: (decision?: DuplicateDecision) => void;
  onCancelApprove: () => void;
  onCopyFirstAccess: (url: string) => void;
  onGenerateFirstAccessLink: () => void;
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

        {/* Approval follow-up: copy/regenerate first access link + send email */}
        {request.status === "approved" ? (
          <div className="space-y-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {props.approvalResult
                ? "Aluno aprovado com sucesso!"
                : "Aluno aprovado. Você pode enviar ou gerar um novo link de primeiro acesso."}
            </p>
            <div className="flex flex-wrap gap-2">
              {props.approvalResult ? (
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
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={props.generateFirstAccessLinkPending}
                  onClick={props.onGenerateFirstAccessLink}
                >
                  <Copy01Icon className="size-4" />
                  {props.generateFirstAccessLinkPending
                    ? "Gerando..."
                    : "Gerar novo link de primeiro acesso"}
                </Button>
              )}
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
