import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StudentNotesController } from "./student-notes.controller";
import { StudentNotesService } from "./student-notes.service";

@Module({
  imports: [DatabaseModule],
  controllers: [StudentNotesController],
  providers: [StudentNotesService],
  exports: [StudentNotesService],
})
export class StudentNotesModule {}
