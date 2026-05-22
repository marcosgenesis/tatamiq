import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AttendancesController } from "./attendances.controller";
import { AttendancesService } from "./attendances.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AttendancesController],
  providers: [AttendancesService],
})
export class AttendancesModule {}
