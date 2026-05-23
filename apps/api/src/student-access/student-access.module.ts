import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StudentAccessController } from "./student-access.controller";
import { StudentAccessService } from "./student-access.service";

@Module({
  imports: [DatabaseModule],
  controllers: [StudentAccessController],
  providers: [StudentAccessService],
  exports: [StudentAccessService],
})
export class StudentAccessModule {}
