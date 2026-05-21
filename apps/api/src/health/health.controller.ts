import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { HealthResponseDto } from "./health.dto";

@ApiTags("health")
@AllowAnonymous()
@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
