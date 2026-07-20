// @vitest-environment jsdom
import type { AcademyOnboardingChecklist } from "@tatamiq/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AcademyOnboardingChecklistCard } from "./academy-onboarding-checklist";

const baseChecklist = {
  steps: {
    turmaCreated: true,
    preRegistrationLinkShared: false,
    firstPreRegistrationApproved: false,
    firstAccessLinkSent: false,
  },
  pendingPreRegistrationCount: 0,
  firstAccessStudentId: null,
  dismissed: false,
} satisfies AcademyOnboardingChecklist;

const completedChecklist = {
  ...baseChecklist,
  steps: {
    turmaCreated: true,
    preRegistrationLinkShared: true,
    firstPreRegistrationApproved: true,
    firstAccessLinkSent: true,
  },
} satisfies AcademyOnboardingChecklist;

describe("AcademyOnboardingChecklistCard", () => {
  it("renders step 2 active with copy CTA when first Turma exists", () => {
    const html = renderToStaticMarkup(
      <AcademyOnboardingChecklistCard
        checklist={baseChecklist}
        onCopyLink={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain("1 de 4 concluídos");
    expect(html).toContain("Compartilhar Link de Pré-Cadastro da Academia");
    expect(html).toContain("Copiar link");
  });

  it("renders step 2 as completed after the link is shared", () => {
    const html = renderToStaticMarkup(
      <AcademyOnboardingChecklistCard
        checklist={{
          ...baseChecklist,
          steps: { ...baseChecklist.steps, preRegistrationLinkShared: true },
        }}
        onCopyLink={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain("2 de 4 concluídos");
    expect(html).not.toContain("Copiar link");
  });

  it("blocks the copy CTA while step 1 is incomplete", () => {
    const html = renderToStaticMarkup(
      <AcademyOnboardingChecklistCard
        checklist={{ ...baseChecklist, steps: { ...baseChecklist.steps, turmaCreated: false } }}
        onCopyLink={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain("disabled");
    expect(html).toContain("0 de 4 concluídos");
  });

  it("shows the celebration banner when all onboarding steps are complete", () => {
    const html = renderToStaticMarkup(
      <AcademyOnboardingChecklistCard
        checklist={completedChecklist}
        onCopyLink={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain("4 de 4 concluídos");
    expect(html).toContain("Academia pronta para operar");
    expect(html).toContain("Fechar guia");
  });

  it("calls dismiss when the celebration close button is clicked", () => {
    const onDismiss = vi.fn();

    render(
      <AcademyOnboardingChecklistCard
        checklist={completedChecklist}
        onCopyLink={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechar guia" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not show the celebration banner before all steps are complete", () => {
    const html = renderToStaticMarkup(
      <AcademyOnboardingChecklistCard
        checklist={baseChecklist}
        onCopyLink={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).not.toContain("Academia pronta para operar");
    expect(html).not.toContain("Fechar guia");
  });
});
