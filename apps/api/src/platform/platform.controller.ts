import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Session } from "@thallesp/nestjs-better-auth";
import {
  PlatformAcademiesResponseDto,
  PlatformAcademyDetailDto,
  PlatformDashboardDto,
  PlatformMeDto,
} from "./platform.dto";
import { PlatformService } from "./platform.service";
import {
  PlatformAdminService,
  type PlatformMe,
  type PlatformSession,
} from "./platform-admin.service";

@ApiTags("platform")
@Controller("platform")
export class PlatformController {
  constructor(
    @Inject(PlatformAdminService) private readonly platformAdminService: PlatformAdminService,
    @Inject(PlatformService) private readonly platformService: PlatformService,
  ) {}

  @Get("me")
  @ApiOkResponse({ type: PlatformMeDto })
  me(@Session() session: PlatformSession): PlatformMe {
    return this.platformAdminService.assertPlatformAdmin(session);
  }

  @Get("dashboard")
  @ApiOkResponse({ type: PlatformDashboardDto })
  dashboard(@Session() session: PlatformSession) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.dashboard();
  }

  @Get("academies")
  @ApiOkResponse({ type: PlatformAcademiesResponseDto })
  academies(
    @Session() session: PlatformSession,
    @Query("q") query?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.listAcademies({
      query,
      page: parseOptionalInteger(page),
      pageSize: parseOptionalInteger(pageSize),
    });
  }

  @Get("academies/:id")
  @ApiOkResponse({ type: PlatformAcademyDetailDto })
  academy(@Session() session: PlatformSession, @Param("id") id: string) {
    this.platformAdminService.assertPlatformAdmin(session);
    return this.platformService.getAcademy(id);
  }
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
