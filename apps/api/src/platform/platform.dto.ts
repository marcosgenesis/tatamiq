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
