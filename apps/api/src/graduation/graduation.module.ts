import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { GraduationController } from "./graduation.controller";
import { GraduationService } from "./graduation.service";

@Module({
  imports: [DatabaseModule],
  controllers: [GraduationController],
  providers: [GraduationService],
  exports: [GraduationService],
})
export class GraduationModule {}
