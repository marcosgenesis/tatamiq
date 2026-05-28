import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MonthlyFeesModule } from "../monthly-fees/monthly-fees.module";
import { AuditService } from "./audit.service";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";
import { PlatformAdminService } from "./platform-admin.service";
import { ReservedAccountService } from "./reserved-account.service";

@Module({
  imports: [DatabaseModule, MonthlyFeesModule],
  controllers: [PlatformController],
  providers: [PlatformAdminService, PlatformService, AuditService, ReservedAccountService],
  exports: [PlatformAdminService, PlatformService, AuditService, ReservedAccountService],
})
export class PlatformModule {}
