import { Controller, Get, HttpCode, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import { BeltDto, ListBeltsResponseDto, UpdateBeltDto } from "./belts.dto";
import { BeltsService } from "./belts.service";

@ApiTags("belts")
@OrgRoles(["owner"])
@Controller("belts")
export class BeltsController {
  constructor(@Inject(BeltsService) private readonly beltsService: BeltsService) {}

  @Get()
  @ApiOkResponse({ type: ListBeltsResponseDto })
  list(@AcademyId() academyId: string): Promise<ListBeltsResponseDto> {
    return this.beltsService.list(academyId);
  }

  @Patch(":id")
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateBeltDto })
  @ApiOkResponse({ type: BeltDto })
  update(
    @Param("id") id: string,
    @ZodBody(UpdateBeltDto) body: UpdateBeltDto,
    @AcademyId() academyId: string,
  ): Promise<BeltDto> {
    return this.beltsService.update(academyId, id, body);
  }

  @Post("seed")
  @HttpCode(200)
  @ApiOkResponse({ type: ListBeltsResponseDto })
  seed(@AcademyId() academyId: string): Promise<ListBeltsResponseDto> {
    return this.beltsService.seedIbjjfBelts(academyId);
  }
}
