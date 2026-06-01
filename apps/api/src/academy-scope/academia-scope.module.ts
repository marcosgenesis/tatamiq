import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AcademiaScope } from "./academia-scope.service";

@Module({
  imports: [DatabaseModule],
  providers: [AcademiaScope],
  exports: [AcademiaScope],
})
export class AcademiaScopeModule {}
