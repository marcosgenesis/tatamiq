import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";
import { PlatformAdminService } from "./platform-admin.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController],
  providers: [PlatformAdminService, PlatformService],
  exports: [PlatformAdminService, PlatformService],
})
export class PlatformModule {}
