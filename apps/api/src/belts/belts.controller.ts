import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
import { BeltDto, ListBeltsResponseDto, type UpdateBeltDto } from "./belts.dto";
import { BeltsService } from "./belts.service";

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
