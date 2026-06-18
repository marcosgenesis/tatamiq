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
  ownerResolution?: "keep_ownerless" | "transfer";
  transferOwnerEmail?: string;
  transferOwnerName?: string;
};

export type StartPlatformSupportInput = {
  targetUserId: string;
  academyId?: string;
  reason?: string;
};

export const platformKeys = {
  me: ["platform", "me"] as const,
  dashboard: ["platform", "dashboard"] as const,
  academies: (query: string, page: number, pageSize: number) =>
    ["platform", "academies", query, page, pageSize] as const,
  academy: (academyId: string) => ["platform", "academies", academyId] as const,
  academyOperationalOverview: (academyId: string) =>
    ["platform", "academies", academyId, "operational-overview"] as const,
  users: (query: string, page: number, pageSize: number) =>
    ["platform", "users", query, page, pageSize] as const,
  user: (userId: string) => ["platform", "users", userId] as const,
  userDeletionImpact: (userId: string) => ["platform", "users", userId, "deletion-impact"] as const,
  administrators: (page: number, pageSize: number) =>
    ["platform", "administrators", page, pageSize] as const,
  audit: (action: string, page: number, pageSize: number) =>
    ["platform", "audit", action, page, pageSize] as const,
  currentSupport: ["platform", "support", "current"] as const,
  firstAccess: (token: string) => ["platform", "first-access", token] as const,
};

export function platformMeQuery() {
  return queryOptions({
    queryKey: platformKeys.me,
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/me");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformDashboardQuery() {
  return queryOptions({
    queryKey: platformKeys.dashboard,
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/dashboard");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformAcademiesQuery(query: string, page: number, pageSize: number) {
  return queryOptions({
    queryKey: platformKeys.academies(query, page, pageSize),
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
  });
}

export function platformAcademyQuery(academyId: string) {
  return queryOptions({
    queryKey: platformKeys.academy(academyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies/{id}", {
        params: { path: { id: academyId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformAcademyOperationalOverviewQuery(academyId: string) {
  return queryOptions({
    queryKey: platformKeys.academyOperationalOverview(academyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/academies/{id}/operational-overview", {
        params: { path: { id: academyId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformUsersQuery(query: string, page: number, pageSize: number) {
  return queryOptions({
    queryKey: platformKeys.users(query, page, pageSize),
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
  });
}

export function platformUserQuery(userId: string) {
  return queryOptions({
    queryKey: platformKeys.user(userId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users/{id}", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformUserDeletionImpactQuery(userId: string, enabled: boolean) {
  return queryOptions({
    queryKey: platformKeys.userDeletionImpact(userId),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/users/{id}/deletion-impact", {
        params: { path: { id: userId } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
    enabled,
  });
}

export function platformAdministratorsQuery(page: number, pageSize: number) {
  return queryOptions({
    queryKey: platformKeys.administrators(page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/administrators", {
        params: { query: { page, pageSize } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function platformAuditQuery(action: string, page: number, pageSize: number) {
  return queryOptions({
    queryKey: platformKeys.audit(action, page, pageSize),
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/audit", {
        params: { query: { ...(action ? { action } : {}), page, pageSize } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function currentPlatformSupportQuery() {
  return queryOptions({
    queryKey: platformKeys.currentSupport,
    queryFn: async (): Promise<PlatformSupportSession | null> => {
      const { data, error } = await api.GET("/platform/support/current");
      if (error) throw error;
      return data ?? null;
    },
    retry: false,
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
