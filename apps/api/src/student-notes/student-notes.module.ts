import { Module } from "@nestjs/common";
import { AcademiaScopeModule } from "../academy-scope/academia-scope.module";
import { DatabaseModule } from "../database/database.module";
import { StudentNotesController } from "./student-notes.controller";
import { StudentNotesService } from "./student-notes.service";

@Module({
  imports: [DatabaseModule, AcademiaScopeModule],
  controllers: [StudentNotesController],
  providers: [StudentNotesService],
  exports: [StudentNotesService],
})
export class StudentNotesModule {}
