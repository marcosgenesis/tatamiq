import createClient from "openapi-fetch";
import type { paths } from "./generated/openapi";

export function createTatamiqClient(baseUrl: string) {
  return createClient<paths>({
    baseUrl,
    credentials: "include",
  });
}

export type TatamiqClient = ReturnType<typeof createTatamiqClient>;
