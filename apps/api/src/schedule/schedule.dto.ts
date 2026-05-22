import { todayScheduleResponseSchema, weeklyScheduleResponseSchema } from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class WeeklyScheduleResponseDto extends createZodDto(weeklyScheduleResponseSchema) {}
export class TodayScheduleResponseDto extends createZodDto(todayScheduleResponseSchema) {}
