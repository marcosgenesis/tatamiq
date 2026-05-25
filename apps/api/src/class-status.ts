export type ClassStatus = "scheduled" | "active" | "ended" | "cancelled";

export function parseClassStatus(status: string): ClassStatus {
  if (status === "scheduled" || status === "active" || status === "ended" || status === "cancelled")
    return status;
  return "scheduled";
}
