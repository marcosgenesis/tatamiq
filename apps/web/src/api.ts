import { createTatamiqClient } from "@tatamiq/contracts/client";

export const api = createTatamiqClient(import.meta.env.VITE_API_URL ?? "http://localhost:3000");
