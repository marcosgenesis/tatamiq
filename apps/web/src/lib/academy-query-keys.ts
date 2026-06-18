export function academyQueryKey(
  academyId: string | null | undefined,
  ...parts: readonly unknown[]
) {
  return ["academy", academyId ?? "no-academy", ...parts] as const;
}
