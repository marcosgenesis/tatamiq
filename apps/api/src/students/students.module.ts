import { Module } from "@nestjs/common";
import { BeltsModule } from "../belts/belts.module";
import { DatabaseModule } from "../database/database.module";
import { StudentAccessModule } from "../student-access/student-access.module";
import { EmailService } from "./email.service";
import { PreRegistrationController } from "./pre-registration.controller";
import { PreRegistrationService } from "./pre-registration.service";
import { PreRegistrationLinkLifecycle } from "./pre-registration-link-lifecycle";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [DatabaseModule, StudentAccessModule, BeltsModule],
  controllers: [PreRegistrationController, StudentsController],
  providers: [StudentsService, PreRegistrationService, PreRegistrationLinkLifecycle, EmailService],
})
export class StudentsModule {}
