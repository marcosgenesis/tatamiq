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

export async function getPlatformAcademy(id: string): Promise<PlatformAcademyDetail> {
  return platformFetch(`/platform/academies/${id}`);
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
