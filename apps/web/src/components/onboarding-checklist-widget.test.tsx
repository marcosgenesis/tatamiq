import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AcademyOnboardingChecklist } from "@tatamiq/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countCompletedOnboardingSteps,
  deriveOnboardingChecklistStepState,
  OnboardingChecklistWidget,
  shouldHideOnboardingChecklist,
} from "./onboarding-checklist-widget";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/api", () => ({
  api: {
    GET: (...args: unknown[]) => getMock(...args),
    POST: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock("@/components/app-shell", () => ({
  useAppShell: () => ({
    activeAcademy: { id: "academy-1", name: "Tatame Centro" },
  }),
}));

function buildChecklist(
  overrides?: Partial<AcademyOnboardingChecklist>,
): AcademyOnboardingChecklist {
  const baseSteps: AcademyOnboardingChecklist["steps"] = {
    turmaCreated: false,
    preRegistrationLinkShared: false,
    firstPreRegistrationApproved: false,
    firstAccessLinkSent: false,
  };

  return {
    pendingPreRegistrationCount: 0,
    firstAccessStudentId: null,
    dismissed: false,
    ...overrides,
    steps: { ...baseSteps, ...overrides?.steps },
  };
}

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingChecklistWidget />
    </QueryClientProvider>,
  );
}

describe("onboarding checklist helpers", () => {
  it("derives completed, active, awaiting, and blocked states from the checklist payload", () => {
    const activeChecklist = buildChecklist({
      steps: {
        turmaCreated: true,
        preRegistrationLinkShared: false,
        firstPreRegistrationApproved: false,
        firstAccessLinkSent: false,
      },
    });
    expect(deriveOnboardingChecklistStepState(activeChecklist, "turmaCreated")).toBe("completed");
    expect(deriveOnboardingChecklistStepState(activeChecklist, "preRegistrationLinkShared")).toBe(
      "active",
    );

    const awaitingChecklist = buildChecklist({
      steps: {
        turmaCreated: true,
        preRegistrationLinkShared: true,
        firstPreRegistrationApproved: false,
        firstAccessLinkSent: false,
      },
      pendingPreRegistrationCount: 2,
    });
    expect(
      deriveOnboardingChecklistStepState(awaitingChecklist, "firstPreRegistrationApproved"),
    ).toBe("awaiting");
    expect(deriveOnboardingChecklistStepState(awaitingChecklist, "firstAccessLinkSent")).toBe(
      "blocked",
    );
  });

  it("hides the widget when dismissed or when all steps are complete", () => {
    expect(shouldHideOnboardingChecklist(buildChecklist({ dismissed: true }))).toBe(true);
    expect(
      shouldHideOnboardingChecklist(
        buildChecklist({
          steps: {
            turmaCreated: true,
            preRegistrationLinkShared: true,
            firstPreRegistrationApproved: true,
            firstAccessLinkSent: true,
          },
        }),
      ),
    ).toBe(true);
    expect(
      countCompletedOnboardingSteps(
        buildChecklist({
          steps: {
            turmaCreated: true,
            preRegistrationLinkShared: false,
            firstPreRegistrationApproved: true,
            firstAccessLinkSent: false,
          },
        }),
      ),
    ).toBe(2);
  });
});

describe("OnboardingChecklistWidget", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("renders progress and derived states from the mocked checklist API", async () => {
    getMock.mockResolvedValue({
      data: buildChecklist({
        steps: {
          turmaCreated: true,
          preRegistrationLinkShared: true,
          firstPreRegistrationApproved: false,
          firstAccessLinkSent: false,
        },
        pendingPreRegistrationCount: 3,
      }),
      error: null,
    });

    renderWidget();

    expect(await screen.findByText("Configuração Inicial da Academia")).toBeTruthy();
    expect(screen.getByText("2 de 4 concluídos")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getAllByText("Concluído")).toHaveLength(2);
    expect(screen.getByText("Aguardando")).toBeTruthy();
    expect(screen.getByText("Bloqueado")).toBeTruthy();
  });

  it("dismisses the widget immediately after clicking the X button", async () => {
    getMock.mockResolvedValue({
      data: buildChecklist({
        steps: {
          turmaCreated: true,
          preRegistrationLinkShared: false,
          firstPreRegistrationApproved: false,
          firstAccessLinkSent: false,
        },
      }),
      error: null,
    });
    postMock.mockResolvedValue({
      data: buildChecklist({
        steps: {
          turmaCreated: true,
          preRegistrationLinkShared: false,
          firstPreRegistrationApproved: false,
          firstAccessLinkSent: false,
        },
        dismissed: true,
      }),
      error: null,
    });

    renderWidget();

    const dismissButton = await screen.findByRole("button", {
      name: "Dispensar configuração inicial",
    });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText("Configuração Inicial da Academia")).toBeNull();
    });
    expect(postMock).toHaveBeenCalledWith("/academy/onboarding-checklist/dismiss");
  });
});
