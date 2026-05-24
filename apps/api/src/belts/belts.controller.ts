import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { OrgRoles, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { auth } from "../auth";
import { BeltDto, ListBeltsResponseDto, type UpdateBeltDto } from "./belts.dto";
import { BeltsService } from "./belts.service";

type SessionWithOrganization = UserSession<typeof auth> & {
  session: { activeOrganizationId?: string | null };
};

@ApiTags("belts")
@OrgRoles(["owner"])
@Controller("belts")
export class BeltsController {
  constructor(@Inject(BeltsService) private readonly beltsService: BeltsService) {}

  @Get()
  @ApiOkResponse({ type: ListBeltsResponseDto })
  list(@Session() session: SessionWithOrganization): Promise<ListBeltsResponseDto> {
    return this.beltsService.list(activeOrganizationId(session));
  }

  @Patch(":id")
  @ApiOkResponse({ type: BeltDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateBeltDto,
    @Session() session: SessionWithOrganization,
  ): Promise<BeltDto> {
    return this.beltsService.update(activeOrganizationId(session), id, body);
  }

  @Post("seed")
  @HttpCode(200)
  @ApiOkResponse({ type: ListBeltsResponseDto })
  seed(@Session() session: SessionWithOrganization): Promise<ListBeltsResponseDto> {
    return this.beltsService.seedIbjjfBelts(activeOrganizationId(session));
  }
}

function activeOrganizationId(session: SessionWithOrganization): string {
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    throw new ForbiddenException("Sessao sem academia ativa.");
  }
  return organizationId;
}
