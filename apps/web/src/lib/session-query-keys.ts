export function sessionQueryKey(userId: string | null | undefined, ...parts: readonly unknown[]) {
  return ["session", userId ?? "anonymous", ...parts] as const;
}

export function studentQueryKey(userId: string | null | undefined, ...parts: readonly unknown[]) {
  return sessionQueryKey(userId, "student", ...parts);
}
