import createClient from "openapi-fetch";
import type { paths } from "./generated/openapi";

export function createAppDoSenseiClient(
  baseUrl: string,
  fetcher?: (input: Request) => Promise<Response>,
) {
  return createClient<paths>({
    baseUrl,
    credentials: "include",
    ...(fetcher ? { fetch: fetcher } : {}),
  });
}

export type AppDoSenseiClient = ReturnType<typeof createAppDoSenseiClient>;
