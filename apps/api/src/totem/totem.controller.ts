import { Controller, Get, Headers, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous, OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import {
  PairTotemDto,
  TotemDeviceDto,
  TotemOccurrenceDto,
  TotemPairingCodeResponseDto,
  TotemPairResponseDto,
  TotemQrResponseDto,
  TotemStateDto,
} from "./totem.dto";
import { TotemService } from "./totem.service";

/**
 * Endpoints do Modo Totem. Não usam a sessão do gestor: a autorização vem do
 * token de dispositivo (Bearer) validado por TotemService.authenticate.
 */
@ApiTags("totem")
@AllowAnonymous()
@Controller("totem")
export class TotemController {
  constructor(@Inject(TotemService) private readonly totemService: TotemService) {}

  @Post("pair")
  @HttpCode(200)
  @ApiBody({ type: PairTotemDto })
  @ApiOkResponse({ type: TotemPairResponseDto })
  pair(@ZodBody(PairTotemDto) body: PairTotemDto) {
    return this.totemService.pair(body);
  }

  @Get("state")
  @ApiOkResponse({ type: TotemStateDto })
  async state(@Headers("authorization") authorization?: string) {
    const auth = await this.totemService.authenticate(authorization);
    return this.totemService.state(auth);
  }

  @Post("classes/:id/start")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: TotemOccurrenceDto })
  async start(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const auth = await this.totemService.authenticate(authorization);
    return this.totemService.start(auth, id);
  }

  @Get("classes/:id/qr")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: TotemQrResponseDto })
  async qr(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const auth = await this.totemService.authenticate(authorization);
    return this.totemService.qr(auth, id);
  }
}

@ApiTags("totem-admin")
@OrgRoles(["owner"])
@Controller("totem/admin")
export class TotemAdminController {
  constructor(@Inject(TotemService) private readonly totemService: TotemService) {}

  @Post("pairing-code")
  @HttpCode(200)
  @ApiOkResponse({ type: TotemPairingCodeResponseDto })
  createPairingCode(@AcademyId() academyId: string, @ActorId() actorId: string) {
    return this.totemService.createPairingCode(academyId, actorId);
  }

  @Get("devices")
  @ApiOkResponse({ type: TotemDeviceDto, isArray: true })
  devices(@AcademyId() academyId: string) {
    return this.totemService.listDevices(academyId);
  }

  @Post("devices/:id/revoke")
  @HttpCode(204)
  @ApiParam({ name: "id" })
  async revoke(@AcademyId() academyId: string, @Param("id") id: string) {
    await this.totemService.revokeDevice(academyId, id);
  }
}
