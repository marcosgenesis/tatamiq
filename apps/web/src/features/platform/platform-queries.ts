import { queryOptions } from "@tanstack/react-query";
import type { components } from "@tatamiq/contracts/generated";
import { api } from "../../api";

export type PlatformMe = components["schemas"]["PlatformMeDto"];
export type PlatformAcademySummary = components["schemas"]["PlatformAcademySummaryDto"];
export type PlatformAcademyOperationalOverview =
  components["schemas"]["PlatformAcademyOperationalOverviewDto"];
export type PlatformUserDetail = components["schemas"]["PlatformUserDetailDto"];
export type PlatformUserDeletionImpact = components["schemas"]["PlatformUserDeletionImpactDto"];
export type PlatformAdministrator = components["schemas"]["PlatformAdministratorDto"];
export type PlatformAuditLogEntry = components["schemas"]["PlatformAuditLogEntryDto"];
export type PlatformSupportSession = components["schemas"]["PlatformSupportSessionDto"] & {
  adminName?: string | null;
  adminEmail?: string | null;
};

export type ProvisionPlatformAcademyInput = {
  academyName: string;
  ownerEmail: string;
  ownerName?: string;
};

export type TransferPlatformAcademyInput = {
  academyId: string;
  ownerEmail: string;
  ownerName?: string;
};

export type AddPlatformAdministratorInput = {
  email: string;
  name?: string;
};

export type DeletePlatformUserInput = {
  userId: string;
  mode: "definitive" | "preserve_history";
  ownerResolution?: "keep_ownerless";
  confirmLeaveOwnerless?: boolean;
};

export type StartPlatformSupportInput = {
  targetUserId: string;
  academyId?: string;
  reason?: string;
};

export const platformKeys = {
  me: (userId: string | null | undefined) => ["platform", "me", userId ?? "anonymous"] as const,
  dashboard: (sessionUserId: string | null | undefined) =>
    ["platform", "dashboard", sessionUserId ?? "anonymous"] as const,
  academies: (
    sessionUserId: string | null | undefined,
    query: string,
    page: number,
    pageSize: number,
  ) => ["platform", "academies", sessionUserId ?? "anonymous", query, page, pageSize] as const,
  academy: (sessionUserId: string | null | undefined, academyId: string) =>
    ["platform", "academies", sessionUserId ?? "anonymous", academyId] as const,
  academyOperationalOverview: (sessionUserId: string | null | undefined, academyId: string) =>
    [
      "platform",
      "academies",
      sessionUserId ?? "anonymous",
      academyId,
      "operational-overview",
    ] as const,
  users: (
    sessionUserId: string | null | undefined,
    query: string,
    page: number,
    pageSize: number,
  ) => ["platform", "users", sessionUserId ?? "anonymous", query, page, pageSize] as const,
  user: (sessionUserId: string | null | undefined, userId: string) =>
    ["platform", "users", sessionUserId ?? "anonymous", userId] as const,
  userDeletionImpact: (sessionUserId: string | null | undefined, userId: string) =>
    ["platform", "users", sessionUserId ?? "anonymous", userId, "deletion-impact"] as const,
  administrators: (sessionUserId: string | null | undefined, page: number, pageSize: number) =>
    ["platform", "administrators", sessionUserId ?? "anonymous", page, pageSize] as const,
  audit: (
    sessionUserId: string | null | undefined,
    action: string,
    page: number,
    pageSize: number,
  ) => ["platform", "audit", sessionUserId ?? "anonymous", action, page, pageSize] as const,
  currentSupport: (sessionUserId: string | null | undefined) =>
    ["platform", "support", "current", sessionUserId ?? "anonymous"] as const,
  firstAccess: (token: string) => ["platform", "first-access", token] as const,
};

export function platformMeQuery(userId?: string | null) {
  return queryOptions({
    queryKey: platformKeys.me(userId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/me");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformDashboardQuery(sessionUserId?: string | null) {
  return queryOptions({
    queryKey: platformKeys.dashboard(sessionUserId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/dashboard");
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformAcademiesQuery(
  sessionUserId: string | null | undefined,
  query: string,
  page: number,
  pageSize: number,
) {
  return queryOptions({
    queryKey: platformKeys.academies(sessionUserId, query, page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies", {
        params: {
          query: {
            ...(query.trim() ? { q: query.trim() } : {}),
            page,
            pageSize,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformAcademyQuery(sessionUserId: string | null | undefined, academyId: string) {
  return queryOptions({
    queryKey: platformKeys.academy(sessionUserId, academyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies/{id}", {
        params: { path: { id: academyId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformAcademyOperationalOverviewQuery(
  sessionUserId: string | null | undefined,
  academyId: string,
) {
  return queryOptions({
    queryKey: platformKeys.academyOperationalOverview(sessionUserId, academyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies/{id}/operational-overview", {
        params: { path: { id: academyId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformUsersQuery(
  sessionUserId: string | null | undefined,
  query: string,
  page: number,
  pageSize: number,
) {
  return queryOptions({
    queryKey: platformKeys.users(sessionUserId, query, page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users", {
        params: {
          query: {
            ...(query.trim() ? { q: query.trim() } : {}),
            page,
            pageSize,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformUserQuery(sessionUserId: string | null | undefined, userId: string) {
  return queryOptions({
    queryKey: platformKeys.user(sessionUserId, userId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users/{id}", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformUserDeletionImpactQuery(
  sessionUserId: string | null | undefined,
  userId: string,
  enabled: boolean,
) {
  return queryOptions({
    queryKey: platformKeys.userDeletionImpact(sessionUserId, userId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users/{id}/deletion-impact", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId && enabled,
  });
}

export function platformAdministratorsQuery(
  sessionUserId: string | null | undefined,
  page: number,
  pageSize: number,
) {
  return queryOptions({
    queryKey: platformKeys.administrators(sessionUserId, page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/administrators", {
        params: { query: { page, pageSize } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function platformAuditQuery(
  sessionUserId: string | null | undefined,
  action: string,
  page: number,
  pageSize: number,
) {
  return queryOptions({
    queryKey: platformKeys.audit(sessionUserId, action, page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/audit", {
        params: { query: { ...(action ? { action } : {}), page, pageSize } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled: !!sessionUserId,
  });
}

export function currentPlatformSupportQuery(sessionUserId?: string | null) {
  return queryOptions({
    queryKey: platformKeys.currentSupport(sessionUserId),
    queryFn: async (): Promise<PlatformSupportSession | null> => {
      const { data, error } = await api.GET("/platform/support/current");
      if (error) throw error;
      return data ?? null;
    },
    retry: false,
    enabled: !!sessionUserId,
    refetchInterval: 60_000,
  });
}

export function reservedFirstAccessPreviewQuery(token: string) {
  return queryOptions({
    queryKey: platformKeys.firstAccess(token),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/first-access/{token}", {
        params: { path: { token } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export async function provisionPlatformAcademy(input: ProvisionPlatformAcademyInput) {
  const { data, error } = await api.POST("/platform/academies/provision", { body: input });
  if (error) throw error;
  return data;
}

export async function transferPlatformAcademy(input: TransferPlatformAcademyInput) {
  const { data, error } = await api.POST("/platform/academies/{id}/transfer", {
    params: { path: { id: input.academyId } },
    body: {
      ownerEmail: input.ownerEmail,
      ...(input.ownerName ? { ownerName: input.ownerName } : {}),
    },
  });
  if (error) throw error;
  return data;
}

export async function addPlatformAcademyResponsible(input: TransferPlatformAcademyInput) {
  const { data, error } = await api.POST("/platform/academies/{id}/responsibles", {
    params: { path: { id: input.academyId } },
    body: {
      ownerEmail: input.ownerEmail,
      ...(input.ownerName ? { ownerName: input.ownerName } : {}),
    },
  });
  if (error) throw error;
  return data;
}

export async function removePlatformAcademyResponsible(input: {
  academyId: string;
  userId: string;
  allowLeavingOwnerless?: boolean;
}) {
  const { data, error } = await api.POST("/platform/academies/{id}/responsibles/{userId}/remove", {
    params: { path: { id: input.academyId, userId: input.userId } },
    body: input.allowLeavingOwnerless ? { allowLeavingOwnerless: true } : {},
  });
  if (error) throw error;
  return data;
}

export async function addPlatformAdministrator(input: AddPlatformAdministratorInput) {
  const { data, error } = await api.POST("/platform/administrators", { body: input });
  if (error) throw error;
  return data;
}

export async function removePlatformAdministrator(id: string) {
  const { data, error } = await api.POST("/platform/administrators/{id}/remove", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data;
}

export async function banPlatformUser(input: { userId: string; reason?: string }) {
  const { data, error } = await api.POST("/platform/users/{id}/ban", {
    params: { path: { id: input.userId } },
    body: input.reason ? { reason: input.reason } : {},
  });
  if (error) throw error;
  return data;
}

export async function unbanPlatformUser(userId: string) {
  const { data, error } = await api.POST("/platform/users/{id}/unban", {
    params: { path: { id: userId } },
  });
  if (error) throw error;
  return data;
}

export async function revokePlatformUserSessions(userId: string) {
  const { data, error } = await api.POST("/platform/users/{id}/revoke-sessions", {
    params: { path: { id: userId } },
  });
  if (error) throw error;
  return data;
}

export async function deletePlatformUser(input: DeletePlatformUserInput) {
  const { userId, ...body } = input;
  const { data, error } = await api.POST("/platform/users/{id}/delete", {
    params: { path: { id: userId } },
    body,
  });
  if (error) throw error;
  return data;
}

export async function startPlatformSupport(input: StartPlatformSupportInput) {
  const { data, error } = await api.POST("/platform/support/start", { body: input });
  if (error) throw error;
  return data;
}

const PENDING_SUPPORT_ACTIVATION_KEY = "tatamiq:pending-platform-support-activation";

export function queuePlatformSupportActivation(supportSessionId: string) {
  window.sessionStorage.setItem(PENDING_SUPPORT_ACTIVATION_KEY, supportSessionId);
}

export function readPendingPlatformSupportActivation() {
  return window.sessionStorage.getItem(PENDING_SUPPORT_ACTIVATION_KEY);
}

export function clearPendingPlatformSupportActivation() {
  window.sessionStorage.removeItem(PENDING_SUPPORT_ACTIVATION_KEY);
}

export async function impersonateWithPendingPlatformSupportActivation(input: {
  supportSessionId: string;
  userId: string;
  impersonateUser: (input: {
    userId: string;
  }) => Promise<{ error?: { message?: string | undefined } | null }>;
}) {
  queuePlatformSupportActivation(input.supportSessionId);
  const impersonation = await input.impersonateUser({ userId: input.userId });
  if (impersonation.error) {
    clearPendingPlatformSupportActivation();
    throw new Error(impersonation.error.message ?? "Erro ao iniciar suporte.");
  }
}

export async function activatePlatformSupport(supportSessionId: string) {
  const { data, error } = await api.POST("/platform/support/activate", {
    body: { supportSessionId },
  });
  if (error) throw error;
  return data;
}

export async function endPlatformSupport() {
  const { data, error } = await api.POST("/platform/support/end");
  if (error) throw error;
  return data;
}

export async function completeReservedFirstAccess(token: string, password: string) {
  const { data, error } = await api.POST("/platform/first-access/{token}/complete", {
    params: { path: { token } },
    body: { password },
  });
  if (error) throw error;
  return data;
}
