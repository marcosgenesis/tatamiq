import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OnboardingFirstAccessStep } from "./academy-onboarding-checklist";

function renderStep(props: ComponentProps<typeof OnboardingFirstAccessStep>) {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <OnboardingFirstAccessStep {...props} />
    </QueryClientProvider>,
  );
}

describe("OnboardingFirstAccessStep", () => {
  it("renders blocked state while Passo 3 is incomplete", () => {
    const html = renderStep({
      firstPreRegistrationApproved: false,
      firstAccessLinkSent: false,
      firstAccessStudentId: null,
    });

    expect(html).toContain("Aprove uma Solicitação de Pré-Cadastro");
    expect(html).not.toContain("Copiar link de acesso");
  });

  it("renders active copy action after the first pre-registration is approved", () => {
    const html = renderStep({
      firstPreRegistrationApproved: true,
      firstAccessLinkSent: false,
      firstAccessStudentId: "student-1",
    });

    expect(html).toContain("Copiar link de acesso");
    expect(html).toContain("Copie o link do aluno aprovado");
  });

  it("renders completed state when first access link was sent", () => {
    const html = renderStep({
      firstPreRegistrationApproved: true,
      firstAccessLinkSent: true,
      firstAccessStudentId: "student-1",
    });

    expect(html).toContain("Link copiado");
    expect(html).not.toContain("Copiar link de acesso");
  });
});
