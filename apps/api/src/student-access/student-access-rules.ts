import { createHash } from "node:crypto";

export const STUDENT_ACCESS_TERMS_VERSION = "student-access-v1" as const;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteAcceptability = "valid" | "expired" | "revoked" | "accepted" | "unavailable";

export function invitePreviewStatus(input: {
  inviteStatus: string;
  expiresAt: Date;
  studentStatus: string;
  now: Date;
}): InviteAcceptability {
  if (input.inviteStatus === "accepted") return "accepted";
  if (input.inviteStatus === "revoked") return "revoked";
  if (input.studentStatus !== "active") return "unavailable";
  if (input.expiresAt.getTime() <= input.now.getTime()) return "expired";
  return "valid";
}

export function studentReadState(input: { status: string; inactiveAt: Date | null; now: Date }) {
  if (input.status === "active") return { readOnly: false, blocked: false };
  if (!input.inactiveAt) return { readOnly: true, blocked: false };

  const readUntil = new Date(input.inactiveAt);
  readUntil.setMonth(readUntil.getMonth() + 12);
  return {
    readOnly: true,
    blocked: input.now.getTime() > readUntil.getTime(),
  };
}

export function canStudentPortalWrite(readOnly: boolean): boolean {
  return !readOnly;
}
