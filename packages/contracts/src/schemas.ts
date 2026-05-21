import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const academyDemoResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type AcademyDemoResponse = z.infer<typeof academyDemoResponseSchema>;
