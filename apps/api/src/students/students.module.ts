import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StudentAccessModule } from "../student-access/student-access.module";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [DatabaseModule, StudentAccessModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
