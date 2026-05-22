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
