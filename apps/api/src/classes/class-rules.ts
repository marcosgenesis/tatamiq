import type { ClassSessionStatus } from "@tatamiq/contracts";

const VALID_TRANSITIONS: Record<string, ClassSessionStatus[]> = {
  scheduled: ["active", "cancelled"],
  active: ["ended"],
  ended: [],
  cancelled: [],
};

export function canTransition(from: string, to: ClassSessionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
