export function academyQueryKey(
  academyId: string | null | undefined,
  ...parts: readonly unknown[]
) {
  return ["academy", academyId ?? "no-academy", ...parts] as const;
}

export function onboardingChecklistQueryKey(academyId: string | null | undefined) {
  return academyQueryKey(academyId, "onboarding-checklist");
}
