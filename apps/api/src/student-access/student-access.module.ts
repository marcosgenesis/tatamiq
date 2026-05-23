import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MonthlyFeesModule } from "../monthly-fees/monthly-fees.module";
import { QrAttendanceService } from "./qr-attendance.service";
import { StudentAccessController } from "./student-access.controller";
import { StudentAccessService } from "./student-access.service";

@Module({
  imports: [DatabaseModule, MonthlyFeesModule],
  controllers: [StudentAccessController],
  providers: [StudentAccessService, QrAttendanceService],
  exports: [StudentAccessService],
})
export class StudentAccessModule {}
