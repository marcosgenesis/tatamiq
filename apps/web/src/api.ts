import { createAppDoSenseiClient } from "@appdosensei/contracts/client";

export const api = createAppDoSenseiClient(import.meta.env.VITE_API_URL ?? "http://localhost:3100");
