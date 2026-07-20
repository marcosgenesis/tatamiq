import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class PlatformMeUserDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty({ type: String, nullable: true })
  role!: string | null;
}

export class PlatformMeDto {
  @ApiProperty({ type: Boolean, example: true })
  isAdmin!: boolean;

  @ApiProperty({ type: () => PlatformMeUserDto })
  user!: PlatformMeUserDto;
}

export class PlatformAcademyResponsibleDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  email!: string;
}

export class PlatformAcademySummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  logo!: string | null;

  @ApiProperty({ type: String })
  createdAt!: string;

  @ApiProperty({ type: () => PlatformAcademyResponsibleDto, isArray: true })
  responsibles!: PlatformAcademyResponsibleDto[];
}

export class PlatformAcademyDetailDto extends PlatformAcademySummaryDto {
  @ApiProperty({ type: String, nullable: true })
  address!: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  instagram!: string | null;
}

const provisionAcademyBodySchema = z.object({
  academyName: z.string(),
  ownerEmail: z.string(),
  ownerName: z.string().optional(),
});

export class ProvisionAcademyBodyDto extends createZodDto(provisionAcademyBodySchema) {}

export class ProvisionAcademyResultDto {
  @ApiProperty({ type: () => PlatformAcademyDetailDto })
  academy!: PlatformAcademyDetailDto;

  @ApiProperty({ type: String })
  ownerUserId!: string;

  @ApiProperty({ type: Boolean })
  ownerWasCreated!: boolean;

  @ApiProperty({ type: String, nullable: true })
  firstAccessLink!: string | null;
}

const transferAcademyBodySchema = z.object({
  ownerEmail: z.string(),
  ownerName: z.string().optional(),
});

export class TransferAcademyBodyDto extends createZodDto(transferAcademyBodySchema) {}

const addResponsibleBodySchema = z.object({
  ownerEmail: z.string(),
  ownerName: z.string().optional(),
});

export class AddResponsibleBodyDto extends createZodDto(addResponsibleBodySchema) {}

const removeResponsibleBodySchema = z.object({
  allowLeavingOwnerless: z.boolean().optional(),
  ownerlessConfirmation: z.string().optional(),
});

export class RemoveResponsibleBodyDto extends createZodDto(removeResponsibleBodySchema) {}

const deleteAcademyBodySchema = z.object({
  confirmationSlug: z.string().trim().min(1),
  irreversibleAccepted: z.boolean(),
  reason: z.string().trim().optional(),
});

export class DeletePlatformAcademyBodyDto extends createZodDto(deleteAcademyBodySchema) {}

export class PlatformAcademyDeletionImpactDto {
  @ApiProperty({ type: Number })
  students!: number;

  @ApiProperty({ type: Number })
  classGroups!: number;

  @ApiProperty({ type: Number })
  classSessions!: number;

  @ApiProperty({ type: Number })
  attendances!: number;

  @ApiProperty({ type: Number })
  monthlyFees!: number;

  @ApiProperty({ type: Number })
  paymentReceipts!: number;

  @ApiProperty({ type: Number })
  preRegistrationRequests!: number;

  @ApiProperty({ type: Number })
  files!: number;
}

export class PlatformAcademyDeletionPreviewDto {
  @ApiProperty({ type: () => PlatformAcademyDetailDto })
  academy!: PlatformAcademyDetailDto;

  @ApiProperty({ type: () => PlatformAcademyResponsibleDto, isArray: true })
  affectedResponsibles!: PlatformAcademyResponsibleDto[];

  @ApiProperty({ type: () => PlatformAcademyDeletionImpactDto })
  impact!: PlatformAcademyDeletionImpactDto;

  @ApiProperty({ type: String })
  irreversibleWarning!: string;
}

export class DeletePlatformAcademyResultDto {
  @ApiProperty({ type: Boolean })
  success!: boolean;

  @ApiProperty({ type: String })
  deletedAcademyId!: string;

  @ApiProperty({ type: String })
  deletedAcademyName!: string;

  @ApiProperty({ type: String })
  deletedAcademySlug!: string;

  @ApiProperty({ type: () => PlatformAcademyDeletionImpactDto })
  impact!: PlatformAcademyDeletionImpactDto;

  @ApiProperty({ type: Number })
  deletedFiles!: number;

  @ApiProperty({ type: () => PlatformAcademyResponsibleDto, isArray: true })
  affectedResponsibles!: PlatformAcademyResponsibleDto[];
}

export class TransferAcademyResultDto extends ProvisionAcademyResultDto {}

export class ReservedFirstAccessPreviewDto {
  @ApiProperty({ type: String, enum: ["valid", "invalid", "expired"] })
  status!: "valid" | "invalid" | "expired";

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;
}

const completeReservedFirstAccessBodySchema = z.object({
  password: z.string(),
});

export class CompleteReservedFirstAccessBodyDto extends createZodDto(
  completeReservedFirstAccessBodySchema,
) {}

export class CompleteReservedFirstAccessResponseDto {
  @ApiProperty({ type: Boolean })
  success!: boolean;
}

export class PlatformPaginationDto {
  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  pageSize!: number;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  totalPages!: number;
}

export class PlatformAcademiesResponseDto {
  @ApiProperty({ type: () => [PlatformAcademySummaryDto] })
  items!: PlatformAcademySummaryDto[];

  @ApiProperty({ type: () => PlatformPaginationDto })
  pagination!: PlatformPaginationDto;
}

export class PlatformDashboardTotalsDto {
  @ApiProperty({ type: Number })
  academies!: number;

  @ApiProperty({ type: Number })
  users!: number;

  @ApiProperty({ type: Number })
  admins!: number;

  @ApiProperty({ type: Number })
  bannedUsers!: number;
}

export class PlatformDashboardDto {
  @ApiProperty({ type: () => PlatformDashboardTotalsDto })
  totals!: PlatformDashboardTotalsDto;

  @ApiProperty({ type: () => [PlatformAcademySummaryDto] })
  recentAcademies!: PlatformAcademySummaryDto[];
}

export class PlatformStudentOperationalDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true })
  belt!: string | null;

  @ApiProperty({ type: Number })
  degree!: number;
}

export class PlatformClassGroupOperationalDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: Number })
  defaultDurationMinutes!: number;
}

export class PlatformMonthlyFeeOperationalDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  studentName!: string;

  @ApiProperty({ type: String })
  reference!: string;

  @ApiProperty({ type: Number })
  amountInCents!: number;

  @ApiProperty({ type: String })
  dueDate!: string;

  @ApiProperty({ type: String })
  status!: string;
}

export class PlatformAttendanceOperationalDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  studentName!: string;

  @ApiProperty({ type: String })
  classGroupName!: string;

  @ApiProperty({ type: String })
  source!: string;

  @ApiProperty({ type: String, enum: ["valid", "invalidated"] })
  status!: "valid" | "invalidated";

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class PlatformPromotionOperationalDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  studentName!: string;

  @ApiProperty({ type: String })
  beltName!: string;

  @ApiProperty({ type: Number })
  degree!: number;

  @ApiProperty({ type: String })
  promotedAt!: string;
}

export class PlatformStudentsOperationalSummaryDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  active!: number;

  @ApiProperty({ type: Number })
  inactive!: number;
}

export class PlatformClassGroupsOperationalSummaryDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  active!: number;

  @ApiProperty({ type: Number })
  archived!: number;
}

export class PlatformMonthlyFeesOperationalSummaryDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  open!: number;

  @ApiProperty({ type: Number })
  paid!: number;

  @ApiProperty({ type: Number })
  underReview!: number;

  @ApiProperty({ type: Number })
  waived!: number;
}

export class PlatformAttendancesOperationalSummaryDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  valid!: number;

  @ApiProperty({ type: Number })
  invalidated!: number;
}

export class PlatformPromotionsOperationalSummaryDto {
  @ApiProperty({ type: Number })
  total!: number;
}

export class PlatformAcademyOperationalSummaryDto {
  @ApiProperty({ type: () => PlatformStudentsOperationalSummaryDto })
  students!: PlatformStudentsOperationalSummaryDto;

  @ApiProperty({ type: () => PlatformClassGroupsOperationalSummaryDto })
  classGroups!: PlatformClassGroupsOperationalSummaryDto;

  @ApiProperty({ type: () => PlatformMonthlyFeesOperationalSummaryDto })
  monthlyFees!: PlatformMonthlyFeesOperationalSummaryDto;

  @ApiProperty({ type: () => PlatformAttendancesOperationalSummaryDto })
  attendances!: PlatformAttendancesOperationalSummaryDto;

  @ApiProperty({ type: () => PlatformPromotionsOperationalSummaryDto })
  promotions!: PlatformPromotionsOperationalSummaryDto;
}

export class PlatformAuditLogEntryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  adminUserId!: string;

  @ApiProperty({ type: String, nullable: true })
  adminName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  adminEmail!: string | null;

  @ApiProperty({ type: String })
  action!: string;

  @ApiProperty({ type: String })
  targetType!: string;

  @ApiProperty({ type: String, nullable: true })
  targetId!: string | null;

  @ApiProperty({ type: String })
  result!: string;

  @ApiProperty({ type: String, nullable: true })
  reason!: string | null;

  @ApiProperty({ type: Object, nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ type: String, nullable: true })
  academyId!: string | null;

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class PlatformAuditListResponseDto {
  @ApiProperty({ type: () => [PlatformAuditLogEntryDto] })
  items!: PlatformAuditLogEntryDto[];

  @ApiProperty({ type: () => PlatformPaginationDto })
  pagination!: PlatformPaginationDto;
}

export class PlatformSensitiveFileUrlDto {
  @ApiProperty({ type: String })
  viewUrl!: string;

  @ApiProperty({ type: String })
  expiresAt!: string;
}

export class PlatformAcademyOperationalOverviewDto {
  @ApiProperty({ type: () => PlatformAcademyOperationalSummaryDto })
  summary!: PlatformAcademyOperationalSummaryDto;

  @ApiProperty({ type: () => [PlatformStudentOperationalDto] })
  students!: PlatformStudentOperationalDto[];

  @ApiProperty({ type: () => [PlatformClassGroupOperationalDto] })
  classGroups!: PlatformClassGroupOperationalDto[];

  @ApiProperty({ type: () => [PlatformMonthlyFeeOperationalDto] })
  monthlyFees!: PlatformMonthlyFeeOperationalDto[];

  @ApiProperty({ type: () => [PlatformAttendanceOperationalDto] })
  attendances!: PlatformAttendanceOperationalDto[];

  @ApiProperty({ type: () => [PlatformPromotionOperationalDto] })
  promotions!: PlatformPromotionOperationalDto[];
}

// --- User management DTOs ---

export class PlatformUserSummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty({ type: String, nullable: true })
  role!: string | null;

  @ApiProperty({ type: Boolean })
  banned!: boolean;

  @ApiProperty({ type: String, nullable: true })
  banReason!: string | null;

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class PlatformUsersResponseDto {
  @ApiProperty({ type: () => [PlatformUserSummaryDto] })
  items!: PlatformUserSummaryDto[];

  @ApiProperty({ type: () => PlatformPaginationDto })
  pagination!: PlatformPaginationDto;
}

export class PlatformUserMembershipDto {
  @ApiProperty({ type: String })
  memberId!: string;

  @ApiProperty({ type: String })
  organizationId!: string;

  @ApiProperty({ type: String })
  organizationName!: string;

  @ApiProperty({ type: String })
  organizationSlug!: string;

  @ApiProperty({ type: String })
  role!: string;

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class PlatformUserStudentAccessDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  studentId!: string;

  @ApiProperty({ type: String })
  studentName!: string;

  @ApiProperty({ type: String })
  organizationId!: string;

  @ApiProperty({ type: String })
  organizationName!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class PlatformUserDetailDto extends PlatformUserSummaryDto {
  @ApiProperty({ type: Boolean })
  emailVerified!: boolean;

  @ApiProperty({ type: Boolean })
  isPlatformAdmin!: boolean;

  @ApiProperty({ type: () => [PlatformUserMembershipDto] })
  memberships!: PlatformUserMembershipDto[];

  @ApiProperty({ type: () => [PlatformUserStudentAccessDto] })
  studentAccessLinks!: PlatformUserStudentAccessDto[];

  @ApiProperty({ type: Number })
  activeSessions!: number;
}

const platformBanUserBodySchema = z.object({
  reason: z.string().optional(),
});

export class PlatformBanUserBodyDto extends createZodDto(platformBanUserBodySchema) {}

export class PlatformActionResultDto {
  @ApiProperty({ type: Boolean })
  success!: boolean;
}

export class RemoveResponsibleResultDto extends PlatformActionResultDto {
  @ApiProperty({ type: Boolean })
  leftOwnerless!: boolean;
}

export class PlatformOwnedAcademyImpactDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  slug!: string;

  @ApiProperty({ type: Boolean })
  isOnlyOwner!: boolean;
}

export class PlatformUserDeletionImpactDto {
  @ApiProperty({ type: String })
  userId!: string;

  @ApiProperty({ type: Number })
  memberships!: number;

  @ApiProperty({ type: () => [PlatformOwnedAcademyImpactDto] })
  ownedAcademies!: PlatformOwnedAcademyImpactDto[];

  @ApiProperty({ type: Number })
  studentAccessLinks!: number;

  @ApiProperty({ type: Number })
  activeSessions!: number;

  @ApiProperty({ type: Boolean })
  isPlatformAdmin!: boolean;
}

const platformDeleteUserBodySchema = z.object({
  mode: z.enum(["definitive", "preserve_history"]),
  ownerResolution: z.enum(["keep_ownerless", "transfer"]).optional(),
  transferOwnerEmail: z.string().optional(),
  transferOwnerName: z.string().optional(),
  confirmLeaveOwnerless: z.boolean().optional(),
});

export class PlatformDeleteUserBodyDto extends createZodDto(platformDeleteUserBodySchema) {}

export class PlatformAdministratorDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  role!: string | null;

  @ApiProperty({ type: Boolean })
  banned!: boolean;

  @ApiProperty({ type: Boolean })
  configured!: boolean;

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class PlatformAdministratorsResponseDto {
  @ApiProperty({ type: () => [PlatformAdministratorDto] })
  items!: PlatformAdministratorDto[];

  @ApiProperty({ type: () => PlatformPaginationDto })
  pagination!: PlatformPaginationDto;
}

const addPlatformAdministratorBodySchema = z.object({
  email: z.string(),
  name: z.string().optional(),
});

export class AddPlatformAdministratorBodyDto extends createZodDto(
  addPlatformAdministratorBodySchema,
) {}

export class AddPlatformAdministratorResultDto {
  @ApiProperty({ type: () => PlatformAdministratorDto })
  administrator!: PlatformAdministratorDto;

  @ApiProperty({ type: Boolean })
  userWasCreated!: boolean;

  @ApiProperty({ type: String, nullable: true })
  firstAccessLink!: string | null;
}

const startPlatformSupportBodySchema = z.object({
  targetUserId: z.string().min(1),
  academyId: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

const activatePlatformSupportBodySchema = z.object({
  supportSessionId: z.string().min(1),
});

export class StartPlatformSupportBodyDto extends createZodDto(startPlatformSupportBodySchema) {}

export class ActivatePlatformSupportBodyDto extends createZodDto(
  activatePlatformSupportBodySchema,
) {}

export class PlatformSupportSessionDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  adminUserId!: string;

  @ApiProperty({ type: String })
  targetUserId!: string;

  @ApiProperty({ type: String, nullable: true })
  academyId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  reason!: string | null;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: String })
  startedAt!: string;

  @ApiProperty({ type: String, nullable: true })
  activatedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  endedAt!: string | null;

  @ApiProperty({ type: String })
  expiresAt!: string;

  @ApiProperty({ type: String, nullable: true, required: false })
  adminName?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  adminEmail?: string | null;
}
