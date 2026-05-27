import { Module } from "@nestjs/common";
import { BeltsModule } from "../belts/belts.module";
import { DatabaseModule } from "../database/database.module";
import { StudentAccessModule } from "../student-access/student-access.module";
import { PreRegistrationController } from "./pre-registration.controller";
import { PreRegistrationService } from "./pre-registration.service";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [DatabaseModule, StudentAccessModule, BeltsModule],
  controllers: [PreRegistrationController, StudentsController],
  providers: [StudentsService, PreRegistrationService],
})
export class StudentsModule {}
