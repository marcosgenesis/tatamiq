import type { StudentGraduationResponse } from "@tatamiq/contracts";
import type { GraduationInput } from "./belt-progress";

export function toGraduationInput(response: StudentGraduationResponse): GraduationInput {
  return {
    currentBelt: response.currentBelt,
    currentDegree: response.currentDegree,
    promotions: response.promotions.map((promotion) => ({
      id: promotion.id,
      beltName: promotion.newBeltName,
      degree: promotion.newDegree,
      promotedAt: promotion.promotedAt,
      notes: promotion.note,
    })),
  };
}
