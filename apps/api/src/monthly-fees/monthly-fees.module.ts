import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "../database/database.module";
import { FeeGenerationService } from "./fee-generation.service";
import { MonthlyFeesController } from "./monthly-fees.controller";
import { MonthlyFeesService } from "./monthly-fees.service";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [MonthlyFeesController],
  providers: [MonthlyFeesService, FeeGenerationService],
  exports: [MonthlyFeesService, FeeGenerationService],
})
export class MonthlyFeesModule {}
