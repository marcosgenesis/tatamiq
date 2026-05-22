import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const studentStatusSchema = z.enum(["active", "inactive"]);
export const graduationPathSchema = z.enum(["adult", "child"]);
export const currentBeltSchema = z.enum([
  "white",
  "gray",
  "yellow",
  "orange",
  "green",
  "blue",
  "purple",
  "brown",
  "black",
]);

export const studentGuardianSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  relationship: z.string().nullable(),
});

export const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthDate: z.string(),
  enrollmentDate: z.string(),
  status: studentStatusSchema,
  inactiveAt: z.string().datetime().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  monthlyAmountInCents: z.number().int().nonnegative().nullable(),
  monthlyDueDay: z.number().int().min(1).max(31).nullable(),
  currentBelt: currentBeltSchema,
  currentDegree: z.number().int().min(0).max(4),
  graduationPath: graduationPathSchema,
  guardian: studentGuardianSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listStudentsResponseSchema = z.object({
  students: z.array(studentSchema),
  summary: z.object({
    active: z.number().int().nonnegative(),
    inactive: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

export const guardianInputSchema = z
  .object({
    name: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    email: z.string().trim().email().optional().or(z.literal("")),
    relationship: z.string().trim().optional().or(z.literal("")),
  })
  .nullable()
  .optional();

export const createStudentSchema = z.object({
  name: z.string().trim().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  enrollmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  monthlyAmountInCents: z.number().int().nonnegative().nullable().optional(),
  monthlyDueDay: z.number().int().min(1).max(31).nullable().optional(),
  currentBelt: currentBeltSchema,
  currentDegree: z.number().int().min(0).max(4),
  graduationPath: graduationPathSchema,
  guardian: guardianInputSchema,
});

export const updateStudentSchema = createStudentSchema.extend({
  status: studentStatusSchema.optional(),
});

export type Student = z.infer<typeof studentSchema>;
export type ListStudentsResponse = z.infer<typeof listStudentsResponseSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const classGroupStatusSchema = z.enum(["active", "archived"]);

export const classGroupScheduleSchema = z.object({
  id: z.string(),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const classGroupLinkedStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const classGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultDurationMinutes: z.number().int().min(15).max(300),
  status: classGroupStatusSchema,
  archivedAt: z.string().datetime().nullable(),
  schedules: z.array(classGroupScheduleSchema),
  tags: z.array(z.string()),
  students: z.array(classGroupLinkedStudentSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listClassGroupsResponseSchema = z.object({
  classGroups: z.array(classGroupSchema),
  summary: z.object({
    active: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

export const classGroupScheduleInputSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const createClassGroupSchema = z.object({
  name: z.string().trim().min(1),
  defaultDurationMinutes: z.number().int().min(15).max(300),
  schedules: z.array(classGroupScheduleInputSchema).min(1),
  tags: z.array(z.string().trim()).optional().default([]),
  studentIds: z.array(z.string()).optional().default([]),
});

export const updateClassGroupSchema = createClassGroupSchema.extend({
  status: classGroupStatusSchema.optional(),
});

export type ClassGroup = z.infer<typeof classGroupSchema>;
export type ListClassGroupsResponse = z.infer<typeof listClassGroupsResponseSchema>;
export type CreateClassGroupInput = z.infer<typeof createClassGroupSchema>;
export type UpdateClassGroupInput = z.infer<typeof updateClassGroupSchema>;

export const classSessionStatusSchema = z.enum(["scheduled", "active", "ended", "cancelled"]);

export const classSessionSchema = z.object({
  id: z.string(),
  classGroupId: z.string(),
  classGroupName: z.string(),
  kind: z.enum(["recurring", "ad_hoc"]),
  status: classSessionStatusSchema,
  scheduledStartAt: z.string().datetime(),
  actualStartAt: z.string().datetime().nullable(),
  durationMinutes: z.number().int().positive(),
  endedAt: z.string().datetime().nullable(),
});

export const startRecurringClassSchema = z.object({
  classGroupId: z.string(),
  scheduleId: z.string(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const qrTokenResponseSchema = z.object({
  token: z.string(),
  previousToken: z.string(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  windowSeconds: z.number().int().positive(),
});

export type ClassSessionStatus = z.infer<typeof classSessionStatusSchema>;
export type ClassSession = z.infer<typeof classSessionSchema>;
export type StartRecurringClassInput = z.infer<typeof startRecurringClassSchema>;
export type QrTokenResponse = z.infer<typeof qrTokenResponseSchema>;

export const scheduleOccurrenceSchema = z.object({
  id: z.string(),
  source: z.enum(["recurring", "ad_hoc"]),
  status: z.enum(["scheduled", "active", "ended", "cancelled"]),
  classGroupId: z.string(),
  classGroupName: z.string(),
  scheduleId: z.string().nullable(),
  classSessionId: z.string().nullable(),
  cancellationId: z.string().nullable(),
  scheduledDate: z.string(),
  scheduledStartAt: z.string().datetime(),
  startTime: z.string(),
  durationMinutes: z.number().int().positive(),
  studentCount: z.number().int().nonnegative(),
  attendanceCount: z.number().int().nonnegative().nullable(),
  tags: z.array(z.string()),
});

export const scheduleDaySchema = z.object({
  date: z.string(),
  weekday: z.number().int().min(0).max(6),
  occurrences: z.array(scheduleOccurrenceSchema),
});

export const weeklyScheduleResponseSchema = z.object({
  weekStart: z.string(),
  days: z.array(scheduleDaySchema),
});

export const todayScheduleResponseSchema = z.object({
  date: z.string(),
  occurrences: z.array(scheduleOccurrenceSchema),
});

export const createAdHocClassSchema = z.object({
  classGroupId: z.string(),
  scheduledStartAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).max(300),
});

export const createRecurringCancellationSchema = z.object({
  classGroupId: z.string(),
  scheduleId: z.string(),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ScheduleOccurrence = z.infer<typeof scheduleOccurrenceSchema>;
export type WeeklyScheduleResponse = z.infer<typeof weeklyScheduleResponseSchema>;
export type TodayScheduleResponse = z.infer<typeof todayScheduleResponseSchema>;
export type CreateAdHocClassInput = z.infer<typeof createAdHocClassSchema>;
export type CreateRecurringCancellationInput = z.infer<typeof createRecurringCancellationSchema>;

export const attendanceSourceSchema = z.enum(["qr", "manual"]);

export const attendanceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  source: attendanceSourceSchema,
  isOutOfGroup: z.boolean(),
  invalidatedAt: z.string().datetime().nullable(),
  invalidationReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const attendanceRosterStudentSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  isOutOfGroup: z.boolean(),
  attendance: attendanceSchema.nullable(),
});

export const attendanceRosterResponseSchema = z.object({
  classSessionId: z.string(),
  roster: z.array(attendanceRosterStudentSchema),
  summary: z.object({
    present: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

export const addManualAttendanceSchema = z.object({
  studentId: z.string(),
});

export const invalidateAttendanceSchema = z.object({
  reason: z.string().trim().min(1),
});

export type AttendanceSource = z.infer<typeof attendanceSourceSchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type AttendanceRosterStudent = z.infer<typeof attendanceRosterStudentSchema>;
export type AttendanceRosterResponse = z.infer<typeof attendanceRosterResponseSchema>;
export type AddManualAttendanceInput = z.infer<typeof addManualAttendanceSchema>;
export type InvalidateAttendanceInput = z.infer<typeof invalidateAttendanceSchema>;
