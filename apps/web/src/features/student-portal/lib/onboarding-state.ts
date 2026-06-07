// Onboarding flow state machine + persistence over an injectable storage port.
// No React, no direct localStorage access. Tested in onboarding-state.test.ts.

export type OnboardingStep = "welcome" | "profile" | "checkin" | "done";

export const ONBOARDING_STEPS: OnboardingStep[] = ["welcome", "profile", "checkin", "done"];

/** Minimal storage contract; localStorage satisfies it, and tests inject a fake. */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const COMPLETED_KEY = "tatamiq.student.onboarding.completed";
const STEP_KEY = "tatamiq.student.onboarding.step";
const NUDGE_PREFIX = "tatamiq.student.nudge.";

export function nextStep(step: OnboardingStep): OnboardingStep {
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index < 0 || index >= ONBOARDING_STEPS.length - 1) return "done";
  return ONBOARDING_STEPS[index + 1] ?? "done";
}

export function createOnboardingState(storage: StoragePort) {
  function isCompleted(): boolean {
    return storage.getItem(COMPLETED_KEY) === "true";
  }

  function complete(): void {
    storage.setItem(COMPLETED_KEY, "true");
    storage.setItem(STEP_KEY, "done");
  }

  return {
    /** Show the welcome flow only to students who have not finished or skipped it. */
    shouldShowWelcome(): boolean {
      return !isCompleted();
    },
    isCompleted,
    currentStep(): OnboardingStep {
      const stored = storage.getItem(STEP_KEY) as OnboardingStep | null;
      return stored && ONBOARDING_STEPS.includes(stored) ? stored : "welcome";
    },
    /** Move to the next step, persisting completion when the flow ends. */
    advance(): OnboardingStep {
      const next = nextStep(this.currentStep());
      if (next === "done") {
        complete();
        return "done";
      }
      storage.setItem(STEP_KEY, next);
      return next;
    },
    goTo(step: OnboardingStep): void {
      if (step === "done") {
        complete();
        return;
      }
      storage.setItem(STEP_KEY, step);
    },
    /** Skipping the flow counts as completion so it never shows again. */
    skip(): void {
      complete();
    },
    complete,
    reset(): void {
      storage.removeItem(COMPLETED_KEY);
      storage.removeItem(STEP_KEY);
    },
    markNudgeSeen(id: string): void {
      storage.setItem(`${NUDGE_PREFIX}${id}`, "true");
    },
    hasSeenNudge(id: string): boolean {
      return storage.getItem(`${NUDGE_PREFIX}${id}`) === "true";
    },
  };
}

export type OnboardingState = ReturnType<typeof createOnboardingState>;

/** Adapter over the real browser storage; falls back to a no-op in SSR/headless. */
export function browserStorage(): StoragePort {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}
