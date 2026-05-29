import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import { ClassSessionDto, QrTokenResponseDto, StartRecurringClassDto } from "./classes.dto";
import { ClassesService } from "./classes.service";

@ApiTags("classes")
@OrgRoles(["owner"])
@Controller("classes")
export class ClassesController {
  constructor(@Inject(ClassesService) private readonly classesService: ClassesService) {}

  @Post("start-recurring")
  @HttpCode(200)
  @ApiBody({ type: StartRecurringClassDto })
  @ApiOkResponse({ type: ClassSessionDto })
  startRecurring(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Body() body: StartRecurringClassDto,
  ): Promise<ClassSessionDto> {
    return this.classesService.startRecurring(academyId, actorId, body);
  }

  @Post(":id/start-ad-hoc")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassSessionDto })
  startAdHoc(@AcademyId() academyId: string, @Param("id") id: string): Promise<ClassSessionDto> {
    return this.classesService.startAdHoc(academyId, id);
  }

  @Get("active")
  @ApiOkResponse({ type: ClassSessionDto })
  async getActive(@AcademyId() academyId: string): Promise<ClassSessionDto | null> {
    return this.classesService.getActive(academyId);
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassSessionDto })
  getById(@AcademyId() academyId: string, @Param("id") id: string): Promise<ClassSessionDto> {
    return this.classesService.getById(academyId, id);
  }

  @Get(":id/qr-token")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: QrTokenResponseDto })
  getQrToken(@AcademyId() academyId: string, @Param("id") id: string): Promise<QrTokenResponseDto> {
    return this.classesService.getQrToken(academyId, id);
  }

  @Post(":id/end")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: ClassSessionDto })
  end(@AcademyId() academyId: string, @Param("id") id: string): Promise<ClassSessionDto> {
    return this.classesService.end(academyId, id);
  }
}
