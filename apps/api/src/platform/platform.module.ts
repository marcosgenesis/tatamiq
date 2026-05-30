import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MonthlyFeesModule } from "../monthly-fees/monthly-fees.module";
import { AuditService } from "./audit.service";
import { PlatformController } from "./platform.controller";
import { PlatformAcademyService } from "./platform-academy.service";
import { PlatformAdminService } from "./platform-admin.service";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformUserService } from "./platform-user.service";
import { ReservedAccountService } from "./reserved-account.service";

@Module({
  imports: [DatabaseModule, MonthlyFeesModule],
  controllers: [PlatformController],
  providers: [
    PlatformAdminService,
    PlatformAcademyService,
    PlatformSupportService,
    PlatformUserService,
    AuditService,
    ReservedAccountService,
  ],
  exports: [
    PlatformAdminService,
    PlatformAcademyService,
    PlatformSupportService,
    PlatformUserService,
    AuditService,
    ReservedAccountService,
  ],
})
export class PlatformModule {}
