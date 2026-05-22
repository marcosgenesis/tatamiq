import {
  createAdHocClassSchema,
  createRecurringCancellationSchema,
  scheduleOccurrenceSchema,
  todayScheduleResponseSchema,
  weeklyScheduleResponseSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class ScheduleOccurrenceDto extends createZodDto(scheduleOccurrenceSchema) {}
export class WeeklyScheduleResponseDto extends createZodDto(weeklyScheduleResponseSchema) {}
export class TodayScheduleResponseDto extends createZodDto(todayScheduleResponseSchema) {}
export class CreateAdHocClassDto extends createZodDto(createAdHocClassSchema) {}
export class CreateRecurringCancellationDto extends createZodDto(
  createRecurringCancellationSchema,
) {}
