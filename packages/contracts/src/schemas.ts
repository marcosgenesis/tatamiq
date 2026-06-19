import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const studentStatusSchema = z.enum(["active", "inactive"]);
export const graduationPathSchema = z.enum(["adult", "child"]);
export const pixKeyTypeSchema = z.enum(["cpf", "email", "phone", "random"]);
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

export const beltSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.enum(["adult", "child"]),
  position: z.number().int(),
  maxDegrees: z.number().int(),
  minMonthsForNextDegree: z.number().int(),
  minAttendancesForNextDegree: z.number().int(),
  minMonthsForNextBelt: z.number().int(),
  minAttendancesForNextBelt: z.number().int(),
});

export const listBeltsResponseSchema = z.object({
  belts: z.array(beltSchema),
});

export type BeltDto = z.infer<typeof beltSchema>;
export type ListBeltsResponse = z.infer<typeof listBeltsResponseSchema>;

export const studentGuardianSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  relationship: z.string().nullable(),
});

export const studentAccessStateSchema = z.object({
  status: z.enum(["none", "pending", "expired", "active", "revoked"]),
  inviteId: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  accessId: z.string().nullable(),
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
  currentBeltId: z.string(),
  currentDegree: z.number().int().min(0).max(9),
  belt: beltSchema.nullable(),
  guardian: studentGuardianSchema.nullable(),
  accessState: studentAccessStateSchema,
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
  pagination: z.object({
    page: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const maxMonthlyAmountInCents = 100_000_000;

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
  monthlyAmountInCents: z
    .number()
    .int()
    .nonnegative()
    .max(maxMonthlyAmountInCents)
    .nullable()
    .optional(),
  monthlyDueDay: z.number().int().min(1).max(31).nullable().optional(),
  currentBeltId: z.string(),
  currentDegree: z.number().int().min(0).max(9),
  guardian: guardianInputSchema,
});

export const updateStudentSchema = createStudentSchema.extend({
  status: studentStatusSchema.optional(),
});

export type StudentAccessState = z.infer<typeof studentAccessStateSchema>;
export type Student = z.infer<typeof studentSchema>;
export type ListStudentsResponse = z.infer<typeof listStudentsResponseSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const createStudentInviteResponseSchema = z.object({
  invite: studentAccessStateSchema.extend({
    status: z.literal("pending"),
    inviteId: z.string(),
    expiresAt: z.string().datetime(),
  }),
  inviteLink: z.string().url(),
});

export const studentInvitePreviewSchema = z.object({
  status: z.enum(["valid", "expired", "revoked", "accepted", "unavailable"]),
  academyName: z.string().nullable(),
  studentName: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
});

export const acceptStudentInviteSchema = z.object({
  termsAccepted: z.literal(true),
  termsVersion: z.literal("student-access-v1"),
});

export const acceptStudentInviteResponseSchema = z.object({
  studentAccessId: z.string(),
  studentId: z.string(),
});

export const studentMeClassGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const studentUpcomingClassSchema = z.object({
  id: z.string(),
  status: z.enum(["scheduled", "active", "ended", "cancelled"]),
  source: z.enum(["recurring", "ad_hoc"]),
  classGroupId: z.string(),
  classGroupName: z.string(),
  scheduledStartAt: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
});

export const studentMeResponseSchema = z.object({
  academy: z.object({
    id: z.string(),
    name: z.string(),
    logo: z.string().nullable(),
    phone: z.string().nullable(),
    instagram: z.string().nullable(),
    address: z.string().nullable(),
    pixKeyType: pixKeyTypeSchema.nullable(),
    pixKey: z.string().nullable(),
    pixCopyPaste: z.string().nullable(),
  }),
  student: z.object({
    id: z.string(),
    name: z.string(),
    status: studentStatusSchema,
    phone: z.string().nullable(),
    email: z.string().nullable(),
    readOnly: z.boolean(),
    blocked: z.boolean(),
  }),
  classGroups: z.array(studentMeClassGroupSchema),
  upcomingClasses: z.array(studentUpcomingClassSchema),
});

export const inviteSummaryResponseSchema = z.object({
  pending: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
});

export type CreateStudentInviteResponse = z.infer<typeof createStudentInviteResponseSchema>;
export type StudentInvitePreview = z.infer<typeof studentInvitePreviewSchema>;
export type AcceptStudentInviteInput = z.infer<typeof acceptStudentInviteSchema>;
export type AcceptStudentInviteResponse = z.infer<typeof acceptStudentInviteResponseSchema>;
export type StudentMeResponse = z.infer<typeof studentMeResponseSchema>;
export type InviteSummaryResponse = z.infer<typeof inviteSummaryResponseSchema>;

// --- Academy Pre-registration ---

export const preRegistrationLinkStatusSchema = z.enum(["active", "paused"]);
export const preRegistrationRequestStatusSchema = z.enum([
  "pending_review",
  "approved",
  "rejected",
]);

export const preRegistrationPublicProfileSchema = z.object({
  academy: z.object({
    name: z.string(),
    logo: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    instagram: z.string().nullable(),
  }),
  link: z.object({
    status: preRegistrationLinkStatusSchema,
  }),
  belts: z.array(beltSchema),
});

export const createPreRegistrationRequestSchema = z.object({
  name: z.string().trim().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().trim().min(1),
  email: z.string().trim().email(),
  cpf: z.string().trim().optional().or(z.literal("")),
  guardianName: z.string().trim().optional().or(z.literal("")),
  guardianPhone: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  consentAccepted: z.literal(true),
  declaredBeltId: z.string().trim().optional().or(z.literal("")),
  declaredDegree: z.number().int().min(0).max(9).optional(),
});

export const preRegistrationRequestSchema = z.object({
  id: z.string(),
  status: preRegistrationRequestStatusSchema,
  name: z.string(),
  birthDate: z.string(),
  phone: z.string(),
  email: z.string(),
  guardianName: z.string().nullable(),
  guardianPhone: z.string().nullable(),
  note: z.string().nullable(),
  duplicateStudent: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  rejectionReason: z.string().nullable(),
  approvedStudentId: z.string().nullable(),
  isInstructorAccount: z.boolean(),
  duplicateStudentHasActiveAccess: z.boolean(),
  cpf: z.string().nullable(),
  declaredBeltId: z.string().nullable(),
  declaredDegree: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
});

export const preRegistrationLinkSchema = z.object({
  id: z.string(),
  status: preRegistrationLinkStatusSchema,
  url: z.string().url(),
  regeneratedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export const listPreRegistrationRequestsResponseSchema = z.object({
  requests: z.array(preRegistrationRequestSchema),
  summary: z.object({
    pendingReview: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  }),
});

export const rejectPreRegistrationRequestSchema = z.object({
  reason: z.string().trim().optional().or(z.literal("")),
});

export const duplicateDecisionSchema = z.enum([
  "link_to_existing",
  "create_new",
  "reject_as_duplicate",
]);

export const approvePreRegistrationRequestSchema = z.object({
  duplicateDecision: duplicateDecisionSchema.optional(),
});

export const approvePreRegistrationResponseSchema = z.object({
  request: preRegistrationRequestSchema,
  firstAccessLink: z.string().url(),
  studentId: z.string(),
});

export const firstAccessPreviewSchema = z.object({
  status: z.enum(["valid", "expired", "consumed", "invalid"]),
  hasPassword: z.boolean(),
  studentName: z.string().nullable(),
  academyName: z.string().nullable(),
});

export const completeFirstAccessSchema = z.object({
  password: z.string().min(8).optional(),
  termsAccepted: z.literal(true),
  termsVersion: z.literal("student-access-v1"),
});

export const completeFirstAccessResponseSchema = z.object({
  redirectTo: z.enum(["sign-in", "student"]),
});

export const generateFirstAccessLinkResponseSchema = z.object({
  firstAccessLink: z.string().url(),
});

export const sendFirstAccessEmailResponseSchema = z.object({
  sent: z.boolean(),
});

export type PreRegistrationPublicProfile = z.infer<typeof preRegistrationPublicProfileSchema>;
export type CreatePreRegistrationRequestInput = z.infer<typeof createPreRegistrationRequestSchema>;
export type PreRegistrationRequest = z.infer<typeof preRegistrationRequestSchema>;
export type PreRegistrationLink = z.infer<typeof preRegistrationLinkSchema>;
export type ListPreRegistrationRequestsResponse = z.infer<
  typeof listPreRegistrationRequestsResponseSchema
>;
export type RejectPreRegistrationRequestInput = z.infer<typeof rejectPreRegistrationRequestSchema>;
export type DuplicateDecision = z.infer<typeof duplicateDecisionSchema>;
export type ApprovePreRegistrationRequestInput = z.infer<
  typeof approvePreRegistrationRequestSchema
>;
export type ApprovePreRegistrationResponse = z.infer<typeof approvePreRegistrationResponseSchema>;
export type FirstAccessPreview = z.infer<typeof firstAccessPreviewSchema>;
export type CompleteFirstAccessInput = z.infer<typeof completeFirstAccessSchema>;
export type CompleteFirstAccessResponse = z.infer<typeof completeFirstAccessResponseSchema>;
export type GenerateFirstAccessLinkResponse = z.infer<typeof generateFirstAccessLinkResponseSchema>;
export type SendFirstAccessEmailResponse = z.infer<typeof sendFirstAccessEmailResponseSchema>;

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
  name: z.string().trim().min(1).max(120),
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

export const confirmQrAttendanceSchema = z.object({
  token: z.string().min(1),
});

export const confirmQrAttendanceResponseSchema = z.object({
  attendance: attendanceSchema,
  classSession: classSessionSchema,
});

export type AttendanceSource = z.infer<typeof attendanceSourceSchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type AttendanceRosterStudent = z.infer<typeof attendanceRosterStudentSchema>;
export type AttendanceRosterResponse = z.infer<typeof attendanceRosterResponseSchema>;
export type AddManualAttendanceInput = z.infer<typeof addManualAttendanceSchema>;
export type InvalidateAttendanceInput = z.infer<typeof invalidateAttendanceSchema>;
export type ConfirmQrAttendanceInput = z.infer<typeof confirmQrAttendanceSchema>;
export type ConfirmQrAttendanceResponse = z.infer<typeof confirmQrAttendanceResponseSchema>;

// --- Monthly Fees ---

export const monthlyFeeStatusSchema = z.enum(["open", "under_review", "paid", "waived"]);

export const monthlyFeeEventTypeSchema = z.enum([
  "waived",
  "adjusted",
  "receipt_approved",
  "receipt_rejected",
  "receipt_replaced",
  "manual_payment",
]);

export const paymentReceiptStatusSchema = z.enum(["pending", "approved", "rejected", "replaced"]);

export const monthlyFeePaymentOriginSchema = z.enum(["manual_payment", "receipt_approved"]);

export const monthlyFeeEventSchema = z.object({
  id: z.string(),
  monthlyFeeId: z.string(),
  type: monthlyFeeEventTypeSchema,
  reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
});

export const paymentReceiptSchema = z.object({
  id: z.string(),
  monthlyFeeId: z.string(),
  studentId: z.string(),
  fileKey: z.string(),
  fileUrl: z.string().nullable(),
  fileType: z.string(),
  fileSizeBytes: z.number().int(),
  note: z.string().nullable(),
  status: paymentReceiptStatusSchema,
  rejectionReason: z.string().nullable(),
  replacedAt: z.string().datetime().nullable(),
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
});

export const monthlyFeeSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  referenceYear: z.number().int(),
  referenceMonth: z.number().int(),
  amountInCents: z.number().int(),
  originalAmountInCents: z.number().int().nullable(),
  dueDate: z.string(),
  status: monthlyFeeStatusSchema,
  isOverdue: z.boolean(),
  paidAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const monthlyFeeDetailSchema = monthlyFeeSchema.extend({
  paymentOrigin: monthlyFeePaymentOriginSchema.nullable(),
  events: z.array(monthlyFeeEventSchema),
  receipts: z.array(paymentReceiptSchema),
});

export const listMonthlyFeesResponseSchema = z.object({
  fees: z.array(monthlyFeeSchema),
  summary: z.object({
    open: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    underReview: z.number().int().nonnegative(),
    paid: z.number().int().nonnegative(),
    waived: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

export const createMonthlyFeeSchema = z.object({
  studentId: z.string().min(1),
  referenceYear: z.number().int().min(2000).max(2100),
  referenceMonth: z.number().int().min(1).max(12),
  amountInCents: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(31),
});

export const generateMissingMonthlyFeesResponseSchema = z.object({
  created: z.number().int().nonnegative(),
});

export const adjustMonthlyFeeSchema = z.object({
  amountInCents: z.number().int().positive(),
  reason: z.string().trim().min(1),
});

export const waiveMonthlyFeeSchema = z.object({
  reason: z.string().trim().min(1),
});

export const manualPaymentSchema = z.object({
  note: z.string().trim().optional().or(z.literal("")),
});

export type AdjustMonthlyFeeInput = z.infer<typeof adjustMonthlyFeeSchema>;
export type WaiveMonthlyFeeInput = z.infer<typeof waiveMonthlyFeeSchema>;
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;

export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string(),
  fileKeySignature: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export const confirmReceiptSchema = z.object({
  fileKey: z.string().min(1),
  fileKeySignature: z.string().min(1),
  fileType: z.string().min(1),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  note: z.string().trim().optional().or(z.literal("")),
});

export const receiptViewUrlResponseSchema = z.object({
  viewUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type ReceiptViewUrlResponse = z.infer<typeof receiptViewUrlResponseSchema>;
export type ConfirmReceiptInput = z.infer<typeof confirmReceiptSchema>;

export const rejectReceiptSchema = z.object({
  reason: z.string().trim().min(1),
});

export type RejectReceiptInput = z.infer<typeof rejectReceiptSchema>;

export const studentMonthlyFeeSchema = z.object({
  id: z.string(),
  referenceYear: z.number().int(),
  referenceMonth: z.number().int(),
  amountInCents: z.number().int(),
  dueDate: z.string(),
  status: monthlyFeeStatusSchema,
  isOverdue: z.boolean(),
  paidAt: z.string().datetime().nullable(),
  lastReceipt: z
    .object({
      id: z.string(),
      status: paymentReceiptStatusSchema,
      rejectionReason: z.string().nullable(),
      note: z.string().nullable(),
      createdAt: z.string().datetime(),
    })
    .nullable(),
});

export const studentMonthlyFeesResponseSchema = z.object({
  fees: z.array(studentMonthlyFeeSchema),
});

export type StudentMonthlyFee = z.infer<typeof studentMonthlyFeeSchema>;
export type StudentMonthlyFeesResponse = z.infer<typeof studentMonthlyFeesResponseSchema>;

export type MonthlyFeeStatus = z.infer<typeof monthlyFeeStatusSchema>;
export type MonthlyFeePaymentOrigin = z.infer<typeof monthlyFeePaymentOriginSchema>;
export type MonthlyFeeEventType = z.infer<typeof monthlyFeeEventTypeSchema>;
export type PaymentReceiptStatus = z.infer<typeof paymentReceiptStatusSchema>;
export type MonthlyFee = z.infer<typeof monthlyFeeSchema>;
export type MonthlyFeeDetail = z.infer<typeof monthlyFeeDetailSchema>;
export type MonthlyFeeEvent = z.infer<typeof monthlyFeeEventSchema>;
export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;
export type ListMonthlyFeesResponse = z.infer<typeof listMonthlyFeesResponseSchema>;
export type CreateMonthlyFeeInput = z.infer<typeof createMonthlyFeeSchema>;
export type GenerateMissingMonthlyFeesResponse = z.infer<
  typeof generateMissingMonthlyFeesResponseSchema
>;

// --- Student Notes ---

export const studentNoteSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  content: z.string(),
  isVisible: z.boolean(),
  archivedAt: z.string().datetime().nullable(),
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createStudentNoteSchema = z.object({
  content: z.string().trim().min(1),
  isVisible: z.boolean().optional().default(true),
});

export const updateStudentNoteSchema = z.object({
  content: z.string().trim().min(1).optional(),
  isVisible: z.boolean().optional(),
});

export const listStudentNotesResponseSchema = z.object({
  notes: z.array(studentNoteSchema),
});

export type StudentNoteDto = z.infer<typeof studentNoteSchema>;
export type CreateStudentNoteInput = z.infer<typeof createStudentNoteSchema>;
export type UpdateStudentNoteInput = z.infer<typeof updateStudentNoteSchema>;
export type ListStudentNotesResponse = z.infer<typeof listStudentNotesResponseSchema>;

// --- Academy Settings ---

export const academyProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  instagram: z.string().nullable(),
  pixKeyType: pixKeyTypeSchema.nullable(),
  pixKey: z.string().nullable(),
  pixCopyPaste: z.string().nullable(),
});

export const updateAcademySchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  instagram: z.string().trim().optional().or(z.literal("")),
  pixKeyType: pixKeyTypeSchema.nullable().optional(),
  pixKey: z.string().trim().optional().or(z.literal("")),
  pixCopyPaste: z.string().trim().optional().or(z.literal("")),
});

export const academyLogoUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string(),
  fileKeySignature: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export const academyConfirmLogoSchema = z.object({
  fileKey: z.string().trim().min(1),
  fileKeySignature: z.string().min(1),
});

export type AcademyProfile = z.infer<typeof academyProfileSchema>;
export type UpdateAcademyInput = z.infer<typeof updateAcademySchema>;
export type AcademyLogoUploadResponse = z.infer<typeof academyLogoUploadResponseSchema>;
export type AcademyConfirmLogoInput = z.infer<typeof academyConfirmLogoSchema>;

// --- Belt Editing ---

export const updateBeltSchema = z.object({
  minMonthsForNextDegree: z.number().int().nonnegative().optional(),
  minAttendancesForNextDegree: z.number().int().nonnegative().optional(),
  minMonthsForNextBelt: z.number().int().nonnegative().optional(),
  minAttendancesForNextBelt: z.number().int().nonnegative().optional(),
  maxDegrees: z.number().int().nonnegative().optional(),
});

export type UpdateBeltInput = z.infer<typeof updateBeltSchema>;

// --- Promotions ---

export const promotionSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  previousBeltId: z.string().nullable(),
  previousBeltName: z.string().nullable(),
  previousDegree: z.number().int(),
  newBeltId: z.string(),
  newBeltName: z.string(),
  newDegree: z.number().int(),
  promotedAt: z.string(),
  promotedByUserId: z.string(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const createPromotionSchema = z.object({
  newBeltId: z.string().min(1),
  newDegree: z.number().int().min(0).max(9),
  promotedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().optional().or(z.literal("")),
});

export const listPromotionsResponseSchema = z.object({
  promotions: z.array(promotionSchema),
});

export type PromotionDto = z.infer<typeof promotionSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type ListPromotionsResponse = z.infer<typeof listPromotionsResponseSchema>;

// --- Eligibility ---

export const eligibilityTypeSchema = z.enum(["degree", "belt", "transition"]);

export const eligibleStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  currentBeltId: z.string(),
  currentBeltName: z.string(),
  currentBeltPath: z.enum(["adult", "child"]),
  currentDegree: z.number().int(),
  eligibilityType: eligibilityTypeSchema,
  monthsSinceReference: z.number().int(),
  attendancesSinceReference: z.number().int(),
  requiredMonths: z.number().int(),
  requiredAttendances: z.number().int(),
});

export const graduationSummaryResponseSchema = z.object({
  degree: z.number().int().nonnegative(),
  belt: z.number().int().nonnegative(),
  transition: z.number().int().nonnegative(),
});

export const listEligibleStudentsResponseSchema = z.object({
  students: z.array(eligibleStudentSchema),
  summary: graduationSummaryResponseSchema,
});

export const dismissEligibilitySchema = z.object({
  type: eligibilityTypeSchema,
  reason: z.string().trim().optional().or(z.literal("")),
  days: z.number().int().positive().optional().default(30),
});

export type EligibilityType = z.infer<typeof eligibilityTypeSchema>;
export type EligibleStudent = z.infer<typeof eligibleStudentSchema>;
export type ListEligibleStudentsResponse = z.infer<typeof listEligibleStudentsResponseSchema>;
export type GraduationSummaryResponse = z.infer<typeof graduationSummaryResponseSchema>;
export type DismissEligibilityInput = z.infer<typeof dismissEligibilitySchema>;

// --- Student Portal: Schedule ---

export const studentScheduleClassSchema = z.object({
  id: z.string(),
  classGroupId: z.string(),
  classGroupName: z.string(),
  scheduledStartAt: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  status: z.enum(["scheduled", "cancelled"]),
  source: z.enum(["recurring", "ad_hoc"]),
});

export const studentScheduleResponseSchema = z.object({
  days: z.array(
    z.object({
      date: z.string(),
      weekday: z.number().int().min(0).max(6),
      classes: z.array(studentScheduleClassSchema),
    }),
  ),
});

export type StudentScheduleClass = z.infer<typeof studentScheduleClassSchema>;
export type StudentScheduleResponse = z.infer<typeof studentScheduleResponseSchema>;

// --- Student Portal: Attendance History ---

export const studentAttendanceSchema = z.object({
  id: z.string(),
  classGroupName: z.string(),
  source: attendanceSourceSchema,
  isOutOfGroup: z.boolean(),
  invalidatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const studentAttendancesResponseSchema = z.object({
  attendances: z.array(studentAttendanceSchema),
});

export type StudentAttendanceDto = z.infer<typeof studentAttendanceSchema>;
export type StudentAttendancesResponse = z.infer<typeof studentAttendancesResponseSchema>;

// --- Student Portal: Profile Editing ---

export const updateStudentProfileSchema = z.object({
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;

// --- Student Portal: Graduation View ---

export const studentGraduationResponseSchema = z.object({
  currentBelt: beltSchema.pick({ id: true, name: true, path: true, position: true }),
  currentDegree: z.number().int(),
  promotions: z.array(promotionSchema),
});

export type StudentGraduationResponse = z.infer<typeof studentGraduationResponseSchema>;

// --- Student Indicators ---

export const studentIndicatorsResponseSchema = z.object({
  hasNewFees: z.boolean(),
  hasNewNotes: z.boolean(),
  hasNewPromotion: z.boolean(),
  hasCancelledClass: z.boolean(),
});

export const markSeenSchema = z.object({
  type: z.enum(["fees", "notes", "graduation", "schedule"]),
});

export type StudentIndicatorsResponse = z.infer<typeof studentIndicatorsResponseSchema>;
export type MarkSeenInput = z.infer<typeof markSeenSchema>;

// --- CSV Import ---

export const csvImportLineSchema = z.object({
  line: z.number().int(),
  name: z.string(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const csvImportPreviewSchema = z.object({
  csv: z.string(),
});

export const csvImportPreviewResponseSchema = z.object({
  totalLines: z.number().int(),
  validLines: z.number().int(),
  errorLines: z.number().int(),
  previewToken: z.string(),
  lines: z.array(csvImportLineSchema),
});

export const csvImportConfirmSchema = z.object({
  previewToken: z.string().trim().min(1),
});

export const csvImportConfirmResponseSchema = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
});

export type CsvImportLine = z.infer<typeof csvImportLineSchema>;
export type CsvImportPreviewInput = z.infer<typeof csvImportPreviewSchema>;
export type CsvImportPreviewResponse = z.infer<typeof csvImportPreviewResponseSchema>;
export type CsvImportConfirmInput = z.infer<typeof csvImportConfirmSchema>;
export type CsvImportConfirmResponse = z.infer<typeof csvImportConfirmResponseSchema>;
