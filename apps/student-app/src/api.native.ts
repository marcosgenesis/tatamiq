import { createAppDoSenseiClient } from "@appdosensei/contracts/client";

import { authClient } from "./lib/auth-client";
import { API_URL } from "./lib/config";

async function authenticatedFetch(request: Request): Promise<Response> {
  const cookie = authClient.getCookie();
  if (!cookie) return fetch(request);

  const headers = new Headers(request.headers);
  headers.set("Cookie", cookie);
  return fetch(new Request(request, { headers }));
}

export const api = createAppDoSenseiClient(API_URL, authenticatedFetch);
