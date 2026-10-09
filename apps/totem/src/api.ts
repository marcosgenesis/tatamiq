export type TotemOccurrence = {
  id: string;
  classGroupId: string;
  classGroupName: string;
  scheduledStartAt: string;
  actualStartAt?: string | null;
  durationMinutes: number;
  status: "scheduled" | "active" | "ended" | "cancelled";
};

export type TotemState = {
  deviceName: string;
  academyName: string;
  activeClasses: TotemOccurrence[];
  today: TotemOccurrence[];
};

export type QrState = {
  url: string;
  issuedAt: string;
  expiresAt: string;
};

export type PairResponse = {
  deviceToken: string;
  deviceName: string;
  academyName: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
const TOKEN_KEY = "appdosensei-totem-device-token";

export const deviceToken = {
  read: () => window.localStorage.getItem(TOKEN_KEY),
  write: (value: string) => window.localStorage.setItem(TOKEN_KEY, value),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

class TotemApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TotemApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = deviceToken.read();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new TotemApiError("Sem conexão com o servidor.", 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new TotemApiError(
      body?.message ?? "Não foi possível concluir a operação.",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function pair(code: string, name: string) {
  return request<PairResponse>("/totem/pair", {
    method: "POST",
    body: JSON.stringify({ code, name }),
  });
}

export function getState() {
  return request<TotemState>("/totem/state");
}

export function startClass(id: string) {
  return request<TotemOccurrence>(`/totem/classes/${encodeURIComponent(id)}/start`, {
    method: "POST",
  });
}

export function getQr(id: string) {
  return request<QrState>(`/totem/classes/${encodeURIComponent(id)}/qr`);
}

export { TotemApiError };
