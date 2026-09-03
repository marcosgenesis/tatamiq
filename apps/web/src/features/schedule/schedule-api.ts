import type { components } from "@appdosensei/contracts/generated";
import { api } from "../../api";

export type CreateAdHocPayload = components["schemas"]["CreateAdHocClassDto"];

/** Create an ad-hoc (avulsa) class. Canonical endpoint used by both desktop and mobile schedule. */
export async function createAdHocClass(payload: CreateAdHocPayload): Promise<void> {
  const { error } = await api.POST("/schedule/ad-hoc-classes", { body: payload });
  if (error) throw new Error("Não foi possível criar a aula avulsa.");
}
