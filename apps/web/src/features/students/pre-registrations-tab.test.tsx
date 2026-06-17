import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RequestCard } from "./pre-registrations-tab";

const baseRequest = {
  id: "request-1",
  status: "pending_review" as const,
  name: "Aluno Teste",
  birthDate: "2000-01-01",
  phone: "11999999999",
  email: "aluno@example.com",
  guardianName: null,
  guardianPhone: null,
  note: null,
  duplicateStudent: null,
  rejectionReason: null,
  approvedStudentId: null,
  isInstructorAccount: false,
  duplicateStudentHasActiveAccess: false,
  createdAt: "2026-05-27T00:00:00.000Z",
  reviewedAt: null,
};

describe("RequestCard", () => {
  it("renders approve action for pending pre-registration", () => {
    const html = renderToStaticMarkup(
      <RequestCard
        request={baseRequest}
        rejecting={false}
        rejectReason=""
        approving={false}
        approvalResult={null}
        approvePending={false}
        generateFirstAccessLinkPending={false}
        sendEmailPending={false}
        onStartReject={vi.fn()}
        onCancelReject={vi.fn()}
        onRejectReasonChange={vi.fn()}
        onReject={vi.fn()}
        onApprove={vi.fn()}
        onCancelApprove={vi.fn()}
        onCopyFirstAccess={vi.fn()}
        onGenerateFirstAccessLink={vi.fn()}
        onSendEmail={vi.fn()}
      />,
    );

    expect(html).toContain("Aprovar");
    expect(html).toContain("Rejeitar");
  });

  it("keeps approved requests read-only when no fresh approval result is available", () => {
    const html = renderToStaticMarkup(
      <RequestCard
        request={{ ...baseRequest, status: "approved", reviewedAt: "2026-05-27T01:00:00.000Z" }}
        rejecting={false}
        rejectReason=""
        approving={false}
        approvalResult={null}
        approvePending={false}
        generateFirstAccessLinkPending={false}
        sendEmailPending={false}
        onStartReject={vi.fn()}
        onCancelReject={vi.fn()}
        onRejectReasonChange={vi.fn()}
        onReject={vi.fn()}
        onApprove={vi.fn()}
        onCancelApprove={vi.fn()}
        onCopyFirstAccess={vi.fn()}
        onGenerateFirstAccessLink={vi.fn()}
        onSendEmail={vi.fn()}
      />,
    );

    expect(html).toContain("Aprovada");
    expect(html).toContain("Gerar novo link de primeiro acesso");
    expect(html).toContain("Enviar por email");
  });

  it("renders copy and email actions after approval result", () => {
    const html = renderToStaticMarkup(
      <RequestCard
        request={{ ...baseRequest, status: "approved", reviewedAt: "2026-05-27T01:00:00.000Z" }}
        rejecting={false}
        rejectReason=""
        approving={false}
        approvalResult={{ firstAccessLink: "http://localhost:5173/student/first-access/token" }}
        approvePending={false}
        generateFirstAccessLinkPending={false}
        sendEmailPending={false}
        onStartReject={vi.fn()}
        onCancelReject={vi.fn()}
        onRejectReasonChange={vi.fn()}
        onReject={vi.fn()}
        onApprove={vi.fn()}
        onCancelApprove={vi.fn()}
        onCopyFirstAccess={vi.fn()}
        onGenerateFirstAccessLink={vi.fn()}
        onSendEmail={vi.fn()}
      />,
    );

    expect(html).toContain("Copiar link de primeiro acesso");
    expect(html).toContain("Enviar por email");
  });

  it("surfaces duplicate and instructor-account warnings", () => {
    const html = renderToStaticMarkup(
      <RequestCard
        request={{
          ...baseRequest,
          isInstructorAccount: true,
          duplicateStudent: { id: "student-1", name: "Aluno Teste" },
          duplicateStudentHasActiveAccess: true,
        }}
        rejecting={false}
        rejectReason=""
        approving={false}
        approvalResult={null}
        approvePending={false}
        generateFirstAccessLinkPending={false}
        sendEmailPending={false}
        onStartReject={vi.fn()}
        onCancelReject={vi.fn()}
        onRejectReasonChange={vi.fn()}
        onReject={vi.fn()}
        onApprove={vi.fn()}
        onCancelApprove={vi.fn()}
        onCopyFirstAccess={vi.fn()}
        onGenerateFirstAccessLink={vi.fn()}
        onSendEmail={vi.fn()}
      />,
    );

    expect(html).toContain("Este email pertence a uma conta de instrutor.");
    expect(html).toContain("Possível duplicidade com Aluno Teste");
    expect(html).toContain("já possui acesso ativo");
  });

  it("renders rejection support with internal reason", () => {
    const html = renderToStaticMarkup(
      <RequestCard
        request={{
          ...baseRequest,
          status: "rejected",
          rejectionReason: "Sem vaga no horário",
          reviewedAt: "2026-05-27T01:00:00.000Z",
        }}
        rejecting={true}
        rejectReason="Sem vaga no horário"
        approving={false}
        approvalResult={null}
        approvePending={false}
        generateFirstAccessLinkPending={false}
        sendEmailPending={false}
        onStartReject={vi.fn()}
        onCancelReject={vi.fn()}
        onRejectReasonChange={vi.fn()}
        onReject={vi.fn()}
        onApprove={vi.fn()}
        onCancelApprove={vi.fn()}
        onCopyFirstAccess={vi.fn()}
        onGenerateFirstAccessLink={vi.fn()}
        onSendEmail={vi.fn()}
      />,
    );

    expect(html).toContain("Motivo interno: Sem vaga no horário");
    expect(html).toContain("Motivo interno opcional");
    expect(html).toContain("Confirmar rejeição");
  });
});
