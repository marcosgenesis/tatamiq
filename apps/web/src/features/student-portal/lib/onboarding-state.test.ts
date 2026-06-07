import { beforeEach, describe, expect, it } from "vitest";
import { createOnboardingState, nextStep, type StoragePort } from "./onboarding-state";

function fakeStorage(): StoragePort {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe("nextStep", () => {
  it("walks the flow and terminates at done", () => {
    expect(nextStep("welcome")).toBe("profile");
    expect(nextStep("profile")).toBe("checkin");
    expect(nextStep("checkin")).toBe("done");
    expect(nextStep("done")).toBe("done");
  });
});

describe("createOnboardingState", () => {
  let storage: StoragePort;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it("shows the welcome flow on first access, starting at welcome", () => {
    const ob = createOnboardingState(storage);
    expect(ob.shouldShowWelcome()).toBe(true);
    expect(ob.currentStep()).toBe("welcome");
  });

  it("advances welcome -> profile -> checkin -> done and then completes", () => {
    const ob = createOnboardingState(storage);
    expect(ob.advance()).toBe("profile");
    expect(ob.advance()).toBe("checkin");
    expect(ob.advance()).toBe("done");
    expect(ob.isCompleted()).toBe(true);
    expect(ob.shouldShowWelcome()).toBe(false);
  });

  it("does not show again for a returning student", () => {
    createOnboardingState(storage).complete();
    const returning = createOnboardingState(storage);
    expect(returning.shouldShowWelcome()).toBe(false);
    expect(returning.currentStep()).toBe("done");
  });

  it("treats skip as completion", () => {
    const ob = createOnboardingState(storage);
    ob.skip();
    expect(ob.shouldShowWelcome()).toBe(false);
  });

  it("resumes from a persisted mid-flow step", () => {
    createOnboardingState(storage).goTo("checkin");
    const resumed = createOnboardingState(storage);
    expect(resumed.shouldShowWelcome()).toBe(true);
    expect(resumed.currentStep()).toBe("checkin");
  });

  it("tracks seen nudges independently of the welcome flow", () => {
    const ob = createOnboardingState(storage);
    expect(ob.hasSeenNudge("presencas-empty")).toBe(false);
    ob.markNudgeSeen("presencas-empty");
    expect(ob.hasSeenNudge("presencas-empty")).toBe(true);
    expect(ob.hasSeenNudge("agenda-empty")).toBe(false);
    // marking a nudge must not complete the welcome flow
    expect(ob.shouldShowWelcome()).toBe(true);
  });

  it("can be reset", () => {
    const ob = createOnboardingState(storage);
    ob.complete();
    ob.reset();
    expect(ob.shouldShowWelcome()).toBe(true);
    expect(ob.currentStep()).toBe("welcome");
  });
});
