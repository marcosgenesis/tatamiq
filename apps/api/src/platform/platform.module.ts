import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MonthlyFeesModule } from "../monthly-fees/monthly-fees.module";
import { AcademyOwnershipService } from "./academy-ownership.service";
import { AuditService } from "./audit.service";
import { PlatformController } from "./platform.controller";
import { PlatformAcademyService } from "./platform-academy.service";
import { PlatformAdminService } from "./platform-admin.service";
import { PlatformAuditedActionService } from "./platform-audited-action.service";
import { PlatformSensitiveFileAccessService } from "./platform-sensitive-file-access.service";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformUserService } from "./platform-user.service";
import { ReservedAccountService } from "./reserved-account.service";
import { UserDeletionService } from "./user-deletion.service";

@Module({
  imports: [DatabaseModule, MonthlyFeesModule],
  controllers: [PlatformController],
  providers: [
    PlatformAdminService,
    AcademyOwnershipService,
    PlatformAcademyService,
    PlatformSupportService,
    PlatformUserService,
    UserDeletionService,
    PlatformSensitiveFileAccessService,
    AuditService,
    PlatformAuditedActionService,
    ReservedAccountService,
  ],
  exports: [
    PlatformAdminService,
    AcademyOwnershipService,
    PlatformAcademyService,
    PlatformSupportService,
    PlatformUserService,
    UserDeletionService,
    AuditService,
    PlatformAuditedActionService,
    ReservedAccountService,
  ],
})
export class PlatformModule {}
