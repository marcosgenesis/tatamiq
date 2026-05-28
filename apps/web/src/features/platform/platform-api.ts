const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3100";

export type PlatformMe = {
  isAdmin: true;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string | null;
  };
};

export type PlatformAcademySummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type PlatformAcademyDetail = PlatformAcademySummary & {
  address: string | null;
  phone: string | null;
  instagram: string | null;
};

export type PlatformDashboard = {
  totals: {
    academies: number;
    users: number;
    admins: number;
    bannedUsers: number;
  };
  recentAcademies: PlatformAcademySummary[];
};

export type PlatformAcademiesResponse = {
  items: PlatformAcademySummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PlatformAcademyOperationalOverview = {
  summary: {
    students: { total: number; active: number; inactive: number };
    classGroups: { total: number; active: number; archived: number };
    monthlyFees: { total: number; open: number; paid: number; underReview: number; waived: number };
    attendances: { total: number; valid: number; invalidated: number };
    promotions: { total: number };
  };
  students: Array<{
    id: string;
    name: string;
    status: string;
    email: string | null;
    belt: string | null;
    degree: number;
  }>;
  classGroups: Array<{
    id: string;
    name: string;
    status: string;
    defaultDurationMinutes: number;
  }>;
  monthlyFees: Array<{
    id: string;
    studentName: string;
    reference: string;
    amountInCents: number;
    dueDate: string;
    status: string;
  }>;
  attendances: Array<{
    id: string;
    studentName: string;
    classGroupName: string;
    source: string;
    status: "valid" | "invalidated";
    createdAt: string;
  }>;
  promotions: Array<{
    id: string;
    studentName: string;
    beltName: string;
    degree: number;
    promotedAt: string;
  }>;
};

export async function getPlatformMe(): Promise<PlatformMe> {
  return platformFetch("/platform/me");
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  return platformFetch("/platform/dashboard");
}

export async function listPlatformAcademies(query: string): Promise<PlatformAcademiesResponse> {
  const params = new URLSearchParams({ pageSize: "10" });
  if (query.trim()) params.set("q", query.trim());
  return platformFetch(`/platform/academies?${params.toString()}`);
}

export type ProvisionAcademyResult = {
  academy: PlatformAcademyDetail;
  ownerUserId: string;
  ownerWasCreated: boolean;
  firstAccessLink: string | null;
};

export type TransferAcademyResult = ProvisionAcademyResult;

export async function provisionPlatformAcademy(input: {
  academyName: string;
  ownerEmail: string;
  ownerName?: string;
}): Promise<ProvisionAcademyResult> {
  return platformPost("/platform/academies/provision", input);
}

export async function transferPlatformAcademy(
  academyId: string,
  input: { ownerEmail: string; ownerName?: string },
): Promise<TransferAcademyResult> {
  return platformPost(`/platform/academies/${academyId}/transfer`, input);
}

export async function getPlatformAcademy(id: string): Promise<PlatformAcademyDetail> {
  return platformFetch(`/platform/academies/${id}`);
}

export async function getPlatformAcademyOperationalOverview(
  id: string,
): Promise<PlatformAcademyOperationalOverview> {
  return platformFetch(`/platform/academies/${id}/operational-overview`);
}

export type PlatformAuditLogEntry = {
  id: string;
  adminUserId: string;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  result: string;
  reason: string | null;
  metadata: unknown;
  academyId: string | null;
  createdAt: string;
};

export type PlatformAuditListResponse = {
  items: PlatformAuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function listPlatformAuditLogs(filters: {
  action?: string;
  adminUserId?: string;
  academyId?: string;
  from?: string;
  to?: string;
  page?: number;
}): Promise<PlatformAuditListResponse> {
  const params = new URLSearchParams({ pageSize: "20" });
  if (filters.action) params.set("action", filters.action);
  if (filters.adminUserId) params.set("adminUserId", filters.adminUserId);
  if (filters.academyId) params.set("academyId", filters.academyId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  return platformFetch(`/platform/audit?${params.toString()}`);
}

// --- User management types ---

export type PlatformUserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
};

export type PlatformUsersResponse = {
  items: PlatformUserSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PlatformUserMembership = {
  memberId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  createdAt: string;
};

export type PlatformUserStudentAccess = {
  id: string;
  studentId: string;
  studentName: string;
  organizationId: string;
  organizationName: string;
  status: string;
  createdAt: string;
};

export type PlatformUserDetail = PlatformUserSummary & {
  emailVerified: boolean;
  memberships: PlatformUserMembership[];
  studentAccessLinks: PlatformUserStudentAccess[];
  activeSessions: number;
};

export async function listPlatformUsers(
  query: string,
  page?: number,
): Promise<PlatformUsersResponse> {
  const params = new URLSearchParams({ pageSize: "10" });
  if (query.trim()) params.set("q", query.trim());
  if (page !== undefined) params.set("page", String(page));
  return platformFetch(`/platform/users?${params.toString()}`);
}

export async function getPlatformUser(id: string): Promise<PlatformUserDetail> {
  return platformFetch(`/platform/users/${id}`);
}

export async function banPlatformUser(id: string, reason?: string): Promise<{ success: boolean }> {
  return platformPost(`/platform/users/${id}/ban`, { reason });
}

export async function unbanPlatformUser(id: string): Promise<{ success: boolean }> {
  return platformPost(`/platform/users/${id}/unban`, {});
}

export async function revokePlatformUserSessions(id: string): Promise<{ success: boolean }> {
  return platformPost(`/platform/users/${id}/revoke-sessions`, {});
}

async function platformFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Acesso restrito a Administradores da Plataforma.");
  }

  return response.json() as Promise<T>;
}

async function platformPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Erro ao executar ação.");
  }

  return response.json() as Promise<T>;
}
