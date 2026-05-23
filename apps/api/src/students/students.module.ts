import { Module } from "@nestjs/common";
import { BeltsModule } from "../belts/belts.module";
import { DatabaseModule } from "../database/database.module";
import { StudentAccessModule } from "../student-access/student-access.module";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [DatabaseModule, StudentAccessModule, BeltsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
