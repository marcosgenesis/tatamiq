import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  childToAdultAge: integer("child_to_adult_age").notNull().default(16),
  address: text("address"),
  phone: text("phone"),
  instagram: text("instagram"),
  pixKeyType: text("pix_key_type"),
  pixKey: text("pix_key"),
  pixCopyPaste: text("pix_copy_paste"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const belts = pgTable(
  "belts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(), // "adult" | "child"
    position: integer("position").notNull(),
    maxDegrees: integer("max_degrees").notNull(),
    minMonthsForNextDegree: integer("min_months_for_next_degree").notNull().default(0),
    minAttendancesForNextDegree: integer("min_attendances_for_next_degree").notNull().default(0),
    minMonthsForNextBelt: integer("min_months_for_next_belt").notNull().default(0),
    minAttendancesForNextBelt: integer("min_attendances_for_next_belt").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("belts_organization_id_idx").on(table.organizationId),
    uniqueIndex("belts_org_slug_uniq").on(table.organizationId, table.slug),
  ],
);

export const students = pgTable(
  "students",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    birthDate: date("birth_date").notNull(),
    enrollmentDate: date("enrollment_date").notNull(),
    status: text("status").notNull().default("active"),
    inactiveAt: timestamp("inactive_at", { withTimezone: true }),
    phone: text("phone"),
    email: text("email"),
    monthlyAmountInCents: integer("monthly_amount_in_cents"),
    monthlyDueDay: integer("monthly_due_day"),
    currentBeltId: text("current_belt_id")
      .notNull()
      .references(() => belts.id, { onDelete: "restrict" }),
    currentDegree: integer("current_degree").notNull().default(0),
    degreeEligibilityDismissedUntil: timestamp("degree_eligibility_dismissed_until", {
      withTimezone: true,
    }),
    degreeEligibilityDismissalReason: text("degree_eligibility_dismissal_reason"),
    beltEligibilityDismissedUntil: timestamp("belt_eligibility_dismissed_until", {
      withTimezone: true,
    }),
    beltEligibilityDismissalReason: text("belt_eligibility_dismissal_reason"),
    transitionDismissedUntil: timestamp("transition_dismissed_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("students_organization_id_idx").on(table.organizationId),
    index("students_status_idx").on(table.status),
  ],
);

export const studentGuardians = pgTable(
  "student_guardians",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    relationship: text("relationship"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("student_guardians_student_id_idx").on(table.studentId)],
);

export const classGroups = pgTable(
  "class_groups",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultDurationMinutes: integer("default_duration_minutes").notNull(),
    status: text("status").notNull().default("active"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("class_groups_organization_id_idx").on(table.organizationId),
    index("class_groups_status_idx").on(table.status),
  ],
);

export const classGroupSchedules = pgTable(
  "class_group_schedules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    classGroupId: text("class_group_id")
      .notNull()
      .references(() => classGroups.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("class_group_schedules_organization_id_idx").on(table.organizationId),
    index("class_group_schedules_class_group_id_idx").on(table.classGroupId),
  ],
);

export const classGroupTags = pgTable(
  "class_group_tags",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    classGroupId: text("class_group_id")
      .notNull()
      .references(() => classGroups.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
  },
  (table) => [
    index("class_group_tags_organization_id_idx").on(table.organizationId),
    index("class_group_tags_class_group_id_idx").on(table.classGroupId),
  ],
);

export const studentClassGroups = pgTable(
  "student_class_groups",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classGroupId: text("class_group_id")
      .notNull()
      .references(() => classGroups.id, { onDelete: "cascade" }),
    activeFrom: date("active_from").notNull(),
    activeUntil: date("active_until"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("student_class_groups_organization_id_idx").on(table.organizationId),
    index("student_class_groups_student_id_idx").on(table.studentId),
    index("student_class_groups_class_group_id_idx").on(table.classGroupId),
  ],
);

export const classSessions = pgTable(
  "class_sessions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    classGroupId: text("class_group_id")
      .notNull()
      .references(() => classGroups.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
    actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes").notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    status: text("status").notNull().default("scheduled"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByUserId: text("cancelled_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("class_sessions_organization_id_idx").on(table.organizationId),
    index("class_sessions_class_group_id_idx").on(table.classGroupId),
    index("class_sessions_scheduled_start_at_idx").on(table.scheduledStartAt),
  ],
);

export const classCancellations = pgTable(
  "class_cancellations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    classGroupId: text("class_group_id")
      .notNull()
      .references(() => classGroups.id, { onDelete: "cascade" }),
    classGroupScheduleId: text("class_group_schedule_id")
      .notNull()
      .references(() => classGroupSchedules.id, { onDelete: "cascade" }),
    occurrenceDate: date("occurrence_date").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }).notNull().defaultNow(),
    revertedAt: timestamp("reverted_at", { withTimezone: true }),
    revertedByUserId: text("reverted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("class_cancellations_organization_id_idx").on(table.organizationId),
    index("class_cancellations_class_group_schedule_id_idx").on(table.classGroupScheduleId),
    index("class_cancellations_occurrence_date_idx").on(table.occurrenceDate),
  ],
);

export type AuthUser = typeof user.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Belt = typeof belts.$inferSelect;
export type Student = typeof students.$inferSelect;
export type StudentGuardian = typeof studentGuardians.$inferSelect;
export type ClassGroup = typeof classGroups.$inferSelect;
export type ClassGroupSchedule = typeof classGroupSchedules.$inferSelect;
export type ClassGroupTag = typeof classGroupTags.$inferSelect;
export type StudentClassGroup = typeof studentClassGroups.$inferSelect;
export const attendances = pgTable(
  "attendances",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    classSessionId: text("class_session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    invalidatedByUserId: text("invalidated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    invalidationReason: text("invalidation_reason"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("attendances_organization_id_idx").on(table.organizationId),
    index("attendances_class_session_id_idx").on(table.classSessionId),
    index("attendances_student_id_idx").on(table.studentId),
    uniqueIndex("attendances_one_valid_per_session_student")
      .on(table.classSessionId, table.studentId)
      .where(sql`invalidated_at IS NULL`),
  ],
);

export const studentAccessInvites = pgTable(
  "student_access_invites",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("student_access_invites_organization_id_idx").on(table.organizationId),
    index("student_access_invites_student_id_idx").on(table.studentId),
    uniqueIndex("student_access_invites_one_pending_per_student")
      .on(table.studentId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const studentAccess = pgTable(
  "student_access",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    authUserId: text("auth_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    lastSeenFeesAt: timestamp("last_seen_fees_at", { withTimezone: true }),
    lastSeenNotesAt: timestamp("last_seen_notes_at", { withTimezone: true }),
    lastSeenGraduationAt: timestamp("last_seen_graduation_at", { withTimezone: true }),
    lastSeenScheduleAt: timestamp("last_seen_schedule_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("student_access_organization_id_idx").on(table.organizationId),
    index("student_access_student_id_idx").on(table.studentId),
    index("student_access_auth_user_id_idx").on(table.authUserId),
    uniqueIndex("student_access_one_active_per_student")
      .on(table.studentId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("student_access_one_active_per_user")
      .on(table.authUserId)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const academyPreRegistrationLinks = pgTable(
  "academy_pre_registration_links",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    status: text("status").notNull().default("active"),
    regeneratedAt: timestamp("regenerated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("academy_pre_registration_links_org_uniq").on(table.organizationId),
    index("academy_pre_registration_links_token_idx").on(table.token),
  ],
);

export const preRegistrationRequests = pgTable(
  "pre_registration_requests",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    linkId: text("link_id")
      .notNull()
      .references(() => academyPreRegistrationLinks.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending_review"),
    name: text("name").notNull(),
    birthDate: date("birth_date").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    note: text("note"),
    consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }).notNull(),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    approvedStudentId: text("approved_student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    approvedStudentAccessId: text("approved_student_access_id").references(() => studentAccess.id, {
      onDelete: "set null",
    }),
    duplicateStudentId: text("duplicate_student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    firstAccessTokenHash: text("first_access_token_hash"),
    firstAccessTokenExpiresAt: timestamp("first_access_token_expires_at", { withTimezone: true }),
    firstAccessConsumedAt: timestamp("first_access_consumed_at", { withTimezone: true }),
    cpf: text("cpf"),
    declaredBeltId: text("declared_belt_id").references(() => belts.id, { onDelete: "set null" }),
    declaredDegree: integer("declared_degree"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pre_registration_requests_organization_id_idx").on(table.organizationId),
    index("pre_registration_requests_link_id_idx").on(table.linkId),
    index("pre_registration_requests_email_idx").on(table.email),
    index("pre_registration_requests_status_idx").on(table.status),
    uniqueIndex("pre_registration_requests_first_access_token_hash_uniq")
      .on(table.firstAccessTokenHash)
      .where(sql`${table.firstAccessTokenHash} IS NOT NULL`),
  ],
);

export const studentAcceptances = pgTable(
  "student_acceptances",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentAccessId: text("student_access_id")
      .notNull()
      .references(() => studentAccess.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    authUserId: text("auth_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    termsVersion: text("terms_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("student_acceptances_organization_id_idx").on(table.organizationId),
    index("student_acceptances_student_access_id_idx").on(table.studentAccessId),
    index("student_acceptances_student_id_idx").on(table.studentId),
  ],
);

export const monthlyFees = pgTable(
  "monthly_fees",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    referenceYear: integer("reference_year").notNull(),
    referenceMonth: integer("reference_month").notNull(),
    amountInCents: integer("amount_in_cents").notNull(),
    originalAmountInCents: integer("original_amount_in_cents"),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("open"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("monthly_fees_organization_id_idx").on(table.organizationId),
    index("monthly_fees_student_id_idx").on(table.studentId),
    index("monthly_fees_status_idx").on(table.status),
    index("monthly_fees_due_date_idx").on(table.dueDate),
    uniqueIndex("monthly_fees_student_month_uniq").on(
      table.studentId,
      table.referenceYear,
      table.referenceMonth,
    ),
  ],
);

export const monthlyFeeEvents = pgTable(
  "monthly_fee_events",
  {
    id: text("id").primaryKey(),
    monthlyFeeId: text("monthly_fee_id")
      .notNull()
      .references(() => monthlyFees.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("monthly_fee_events_monthly_fee_id_idx").on(table.monthlyFeeId),
    index("monthly_fee_events_organization_id_idx").on(table.organizationId),
  ],
);

export const paymentReceipts = pgTable(
  "payment_receipts",
  {
    id: text("id").primaryKey(),
    monthlyFeeId: text("monthly_fee_id")
      .notNull()
      .references(() => monthlyFees.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    fileKey: text("file_key").notNull(),
    fileUrl: text("file_url"),
    fileType: text("file_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    note: text("note"),
    status: text("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    replacedAt: timestamp("replaced_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_receipts_monthly_fee_id_idx").on(table.monthlyFeeId),
    index("payment_receipts_organization_id_idx").on(table.organizationId),
    index("payment_receipts_student_id_idx").on(table.studentId),
    index("payment_receipts_status_idx").on(table.status),
  ],
);

export const studentNotes = pgTable(
  "student_notes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("student_notes_organization_id_idx").on(table.organizationId),
    index("student_notes_student_id_idx").on(table.studentId),
  ],
);

export const promotions = pgTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    previousBeltId: text("previous_belt_id").references(() => belts.id, {
      onDelete: "set null",
    }),
    previousDegree: integer("previous_degree").notNull(),
    newBeltId: text("new_belt_id")
      .notNull()
      .references(() => belts.id, { onDelete: "restrict" }),
    newDegree: integer("new_degree").notNull(),
    promotedAt: date("promoted_at").notNull(),
    promotedByUserId: text("promoted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("promotions_organization_id_idx").on(table.organizationId),
    index("promotions_student_id_idx").on(table.studentId),
  ],
);

export const studentContactChanges = pgTable(
  "student_contact_changes",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    field: text("field").notNull(), // "phone" | "email"
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    changedByUserId: text("changed_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("student_contact_changes_student_id_idx").on(table.studentId)],
);

export type ClassSession = typeof classSessions.$inferSelect;
export type ClassCancellation = typeof classCancellations.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type StudentAccessInvite = typeof studentAccessInvites.$inferSelect;
export type StudentAccess = typeof studentAccess.$inferSelect;
export type AcademyPreRegistrationLink = typeof academyPreRegistrationLinks.$inferSelect;
export type PreRegistrationRequest = typeof preRegistrationRequests.$inferSelect;
export type StudentAcceptance = typeof studentAcceptances.$inferSelect;
export type MonthlyFee = typeof monthlyFees.$inferSelect;
export type MonthlyFeeEvent = typeof monthlyFeeEvents.$inferSelect;
export type PaymentReceipt = typeof paymentReceipts.$inferSelect;
export type StudentNote = typeof studentNotes.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type StudentContactChange = typeof studentContactChanges.$inferSelect;

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    result: text("result").notNull().default("success"),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    academyId: text("academy_id").references(() => organization.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_admin_user_id_idx").on(table.adminUserId),
    index("admin_audit_logs_action_idx").on(table.action),
    index("admin_audit_logs_target_type_idx").on(table.targetType),
    index("admin_audit_logs_academy_id_idx").on(table.academyId),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

export const platformSupportSessions = pgTable(
  "platform_support_sessions",
  {
    id: text("id").primaryKey(),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    academyId: text("academy_id").references(() => organization.id, { onDelete: "set null" }),
    reason: text("reason"),
    status: text("status").notNull().default("pending"),
    impersonationSessionId: text("impersonation_session_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("platform_support_sessions_admin_user_id_idx").on(table.adminUserId),
    index("platform_support_sessions_target_user_id_idx").on(table.targetUserId),
    index("platform_support_sessions_status_idx").on(table.status),
    index("platform_support_sessions_impersonation_session_id_idx").on(
      table.impersonationSessionId,
    ),
  ],
);

export type PlatformSupportSession = typeof platformSupportSessions.$inferSelect;
