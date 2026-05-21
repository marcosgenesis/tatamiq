import { Controller, Get, Inject, NotFoundException } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Database } from "@tatamiq/database";
import { academies } from "@tatamiq/database";
import { eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { AcademyDemoResponseDto } from "./academies.dto";

@ApiTags("academies")
@Controller("academies")
export class AcademiesController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get("demo")
  @ApiOkResponse({ type: AcademyDemoResponseDto })
  async getDemoAcademy(): Promise<AcademyDemoResponseDto> {
    const [academy] = await this.db
      .select({ id: academies.id, name: academies.name })
      .from(academies)
      .where(eq(academies.name, "Academia Demo"))
      .limit(1);

    if (!academy) {
      throw new NotFoundException(
        "Academia Demo not found. Run pnpm --filter @tatamiq/database db:seed.",
      );
    }

    return academy;
  }
}
