type RuleResult = { allowed: true } | { allowed: false; reason: string };

const ALLOWED_STATUSES_FOR_ATTENDANCE = new Set(["active", "ended"]);

export function canAddAttendance(classStatus: string): RuleResult {
  if (ALLOWED_STATUSES_FOR_ATTENDANCE.has(classStatus)) return { allowed: true };
  return {
    allowed: false,
    reason: `Não é possível registrar presença em aula com status "${classStatus}".`,
  };
}

export function canInvalidateAttendance(invalidatedAt: string | null): RuleResult {
  if (!invalidatedAt) return { allowed: true };
  return { allowed: false, reason: "Esta presença já foi invalidada." };
}
