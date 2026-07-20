import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import {
  AcademyConfirmLogoDto,
  AcademyLogoUploadResponseDto,
  AcademyOnboardingChecklistDto,
  AcademyProfileDto,
  UpdateAcademyDto,
} from "./academy.dto";
import { AcademyService } from "./academy.service";

@ApiTags("academy")
@OrgRoles(["owner"])
@Controller("academy")
export class AcademyController {
  constructor(@Inject(AcademyService) private readonly academyService: AcademyService) {}

  @Get()
  @ApiOkResponse({ type: AcademyProfileDto })
  get(@AcademyId() academyId: string): Promise<AcademyProfileDto> {
    return this.academyService.get(academyId);
  }

  @Get("onboarding-checklist")
  @ApiOkResponse({ type: AcademyOnboardingChecklistDto })
  onboardingChecklist(@AcademyId() academyId: string): Promise<AcademyOnboardingChecklistDto> {
    return this.academyService.getOnboardingChecklist(academyId);
  }

  @Patch()
  @ApiBody({ type: UpdateAcademyDto })
  @ApiOkResponse({ type: AcademyProfileDto })
  update(
    @AcademyId() academyId: string,
    @ZodBody(UpdateAcademyDto) body: UpdateAcademyDto,
  ): Promise<AcademyProfileDto> {
    return this.academyService.update(academyId, body);
  }

  @Post("logo/upload-url")
  @HttpCode(200)
  @ApiOkResponse({ type: AcademyLogoUploadResponseDto })
  logoUploadUrl(@AcademyId() academyId: string): Promise<AcademyLogoUploadResponseDto> {
    return this.academyService.generateLogoUploadUrl(academyId);
  }

  @Post("logo/confirm")
  @HttpCode(200)
  @ApiBody({ type: AcademyConfirmLogoDto })
  @ApiOkResponse({ type: AcademyProfileDto })
  confirmLogo(
    @AcademyId() academyId: string,
    @ZodBody(AcademyConfirmLogoDto) body: AcademyConfirmLogoDto,
  ): Promise<AcademyProfileDto> {
    if (!body.fileKey) {
      throw new BadRequestException("fileKey é obrigatório.");
    }
    return this.academyService.confirmLogo(academyId, body.fileKey, body.fileKeySignature);
  }
}
