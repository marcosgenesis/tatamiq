import { ApiProperty } from "@nestjs/swagger";

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

export class PlatformAcademyOwnerDto {
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

  @ApiProperty({ type: () => PlatformAcademyOwnerDto, nullable: true })
  owner!: PlatformAcademyOwnerDto | null;
}

export class PlatformAcademyDetailDto extends PlatformAcademySummaryDto {
  @ApiProperty({ type: String, nullable: true })
  address!: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  instagram!: string | null;
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
