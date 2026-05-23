import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { QrAttendanceService } from "./qr-attendance.service";
import { StudentAccessController } from "./student-access.controller";
import { StudentAccessService } from "./student-access.service";

@Module({
  imports: [DatabaseModule],
  controllers: [StudentAccessController],
  providers: [StudentAccessService, QrAttendanceService],
  exports: [StudentAccessService],
})
export class StudentAccessModule {}
