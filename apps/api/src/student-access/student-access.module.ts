import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { GraduationModule } from "../graduation/graduation.module";
import { MonthlyFeesModule } from "../monthly-fees/monthly-fees.module";
import { StudentNotesModule } from "../student-notes/student-notes.module";
import { QrAttendanceService } from "./qr-attendance.service";
import { StudentAccessController } from "./student-access.controller";
import { StudentAccessService } from "./student-access.service";
import { StudentPortalService } from "./student-portal.service";

@Module({
  imports: [DatabaseModule, MonthlyFeesModule, StudentNotesModule, GraduationModule],
  controllers: [StudentAccessController],
  providers: [StudentAccessService, QrAttendanceService, StudentPortalService],
  exports: [StudentAccessService],
})
export class StudentAccessModule {}
