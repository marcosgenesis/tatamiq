import type { PreRegistrationRequest } from "@tatamiq/contracts";
import {
  Alert01Icon,
  Copy01Icon,
  Link04Icon,
  Mail01Icon,
  RefreshIcon,
  Tick01Icon,
} from "hugeicons-react";
import { ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { ageLabel, formatDate } from "../../lib/formatting";
import { type DuplicateDecision, usePreRegistrationsWorkflow } from "./pre-registrations-workflow";

type RequestFilter = "pending_review" | "approved" | "rejected";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export function PreRegistrationsTab() {
  const workflow = usePreRegistrationsWorkflow();
  const { link, linkQuery, requests, requestsQuery } = workflow;
  const [filter, setFilter] = useState<RequestFilter>("pending_review");
  const [showQr, setShowQr] = useState(false);

  const summary = requestsQuery.data?.summary;
  const filteredRequests = useMemo(
    () => requests.filter((r) => r.status === filter),
    [requests, filter],
  );

  const counts = {
    pending_review: summary?.pendingReview ?? 0,
    approved: summary?.approved ?? 0,
    rejected: summary?.rejected ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Link card */}
      <div className="rounded-[14px] border border-border bg-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-[10px] bg-primary/10 text-primary">
              <Link04Icon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Link de pré-cadastro</p>
              <p className="text-xs text-muted-foreground">Compartilhe para receber solicitações</p>
            </div>
          </div>
          {link && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                link.status === "active"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  link.status === "active" ? "bg-green-400" : "bg-amber-400"
                }`}
                aria-hidden="true"
              />
              {link.status === "active" ? "Ativo" : "Pausado"}
            </span>
          )}
        </div>

        <div className="space-y-3 p-4">
          {linkQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando link...</p>
          )}

          {link && (
            <>
              {link.status === "paused" && (
                <div className="flex items-center gap-2 rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                  <Alert01Icon className="size-3.5 shrink-0" />
                  Novos pré-cadastros estão bloqueados enquanto o link estiver pausado.
                </div>
              )}

              {/* URL + copy */}
              <div
                className={`flex items-center gap-2 rounded-[10px] border border-border bg-background px-3 py-2 ${
                  link.status !== "active" ? "opacity-50" : ""
                }`}
              >
                <span className="flex-1 truncate text-xs text-muted-foreground">{link.url}</span>
                <button
                  type="button"
                  onClick={workflow.copyLink}
                  className="shrink-0 text-primary hover:opacity-80"
                  aria-label="Copiar link"
                >
                  <Copy01Icon className="size-4" />
                </button>
              </div>

              {/* QR code */}
              {showQr && (
                <div className="flex justify-center rounded-[10px] border border-border bg-white p-4">
                  <QRCodeSVG value={link.url} size={160} />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {link.status === "active" ? (
                  <Button type="button" variant="secondary" size="sm" onClick={workflow.copyLink}>
                    <Copy01Icon className="size-4" /> Copiar link
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => workflow.submitLinkAction("reactivate")}
                  >
                    Reativar link
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQr((v) => !v)}
                >
                  <QrCode className="size-4" />
                  {showQr ? "Ocultar QR" : "QR code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-4" /> Abrir
                </Button>
                {link.status === "active" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => workflow.submitLinkAction("pause")}
                  >
                    Pausar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => workflow.submitLinkAction("regenerate")}
                >
                  <RefreshIcon className="size-4" /> Regenerar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Requests section */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 rounded-[12px] border border-border bg-muted/30 p-1">
          {(
            [
              { value: "pending_review", label: "Em análise" },
              { value: "approved", label: "Aprovadas" },
              { value: "rejected", label: "Rejeitadas" },
            ] as { value: RequestFilter; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-sm font-medium transition ${
                filter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  filter === value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[value]}
              </span>
            </button>
          ))}
        </div>

        {requestsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando solicitações...</p>
        )}

        {requestsQuery.isError && (
          <div className="rounded-[14px] border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {requestsQuery.error instanceof Error
              ? requestsQuery.error.message
              : "Não foi possível carregar pré-cadastros."}
          </div>
        )}

        {!requestsQuery.isError && !requestsQuery.isLoading && filteredRequests.length === 0 && (
          <div className="grid place-items-center rounded-[14px] border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {filter === "pending_review" ? "Nenhuma solicitação em análise" : "Nenhum resultado"}
            </p>
            {filter === "pending_review" && link && (
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Compartilhe o link de pré-cadastro para começar a receber solicitações.
              </p>
            )}
            {filter === "pending_review" && link && (
              <button
                type="button"
                onClick={workflow.copyLink}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Copy01Icon className="size-4" /> Copiar link
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filteredRequests.map((request) => (
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
    <div className="rounded-[14px] border border-border bg-card">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
        {/* Left: avatar + info */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {request.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{request.name}</span>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ageLabel(request.birthDate)} · {formatDate(request.birthDate)}
              {request.phone ? ` · ${request.phone}` : ""}
            </p>
            {request.declaredBeltId && (
              <div className="mt-1.5">
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  Faixa declarada
                  {request.declaredDegree ? ` · ${request.declaredDegree}º grau` : ""}
                </span>
              </div>
            )}
            {request.guardianName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Responsável: {request.guardianName}
                {request.guardianPhone ? ` · ${request.guardianPhone}` : ""}
              </p>
            )}
            {request.note && <p className="mt-1.5 text-sm text-foreground">"{request.note}"</p>}
            <p className="mt-1 text-xs text-muted-foreground">{timeAgo(request.createdAt)}</p>

            {request.isInstructorAccount && (
              <p className="mt-2 flex items-center gap-2 rounded-[10px] border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
                <Alert01Icon className="size-3.5 shrink-0" />
                Este email pertence a uma conta de instrutor.
              </p>
            )}

            {request.duplicateStudent && (
              <p className="mt-2 rounded-[10px] border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                Possível duplicidade com {request.duplicateStudent.name}.
                {request.duplicateStudentHasActiveAccess ? " (já possui acesso ativo)" : ""}
              </p>
            )}

            {request.rejectionReason && (
              <p className="mt-1 text-xs text-muted-foreground">
                Motivo interno: {request.rejectionReason}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {request.status === "pending_review" && (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              disabled={props.approvePending}
              onClick={() => props.onApprove()}
            >
              <Tick01Icon className="size-4" /> Aprovar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={props.onStartReject}>
              Rejeitar
            </Button>
          </div>
        )}
      </div>

      {/* Approval follow-up */}
      {request.status === "approved" && (
        <div className="mx-4 mb-4 space-y-3 rounded-[10px] border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-xs font-medium text-green-400">
            {props.approvalResult
              ? "Aluno aprovado com sucesso!"
              : "Aprovada. Você pode enviar ou gerar um novo link de primeiro acesso."}
          </p>
          <div className="flex flex-wrap gap-2">
            {props.approvalResult ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (props.approvalResult)
                    props.onCopyFirstAccess(props.approvalResult.firstAccessLink);
                }}
              >
                <Copy01Icon className="size-4" /> Copiar link de primeiro acesso
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
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
              size="sm"
              disabled={props.sendEmailPending}
              onClick={props.onSendEmail}
            >
              <Mail01Icon className="size-4" />
              {props.sendEmailPending ? "Enviando..." : "Enviar por email"}
            </Button>
          </div>
        </div>
      )}

      {/* Duplicate decision */}
      {props.approving && request.duplicateStudent && (
        <div className="mx-4 mb-4 space-y-3 rounded-[10px] border border-border p-3">
          <p className="text-xs font-medium text-foreground">
            Decisão de duplicata: {request.duplicateStudent.name}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={request.duplicateStudentHasActiveAccess || props.approvePending}
              onClick={() => props.onApprove("link_to_existing")}
            >
              Vincular ao aluno existente
              {request.duplicateStudentHasActiveAccess ? " (acesso ativo)" : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={props.approvePending}
              onClick={() => props.onApprove("create_new")}
            >
              Criar aluno novo mesmo assim
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={props.approvePending}
              onClick={() => props.onApprove("reject_as_duplicate")}
            >
              Rejeitar como duplicata
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={props.onCancelApprove}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Reject form */}
      {props.rejecting && (
        <div className="mx-4 mb-4 space-y-2 rounded-[10px] border border-border p-3">
          <Textarea
            value={props.rejectReason}
            onChange={(event) => props.onRejectReasonChange(event.target.value)}
            placeholder="Motivo interno opcional"
          />
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={props.onReject}>
              Confirmar rejeição
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={props.onCancelReject}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
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
