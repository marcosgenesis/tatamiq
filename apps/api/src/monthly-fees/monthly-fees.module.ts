import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "../database/database.module";
import { FeeGenerationService } from "./fee-generation.service";
import { MonthlyFeesController } from "./monthly-fees.controller";
import { MonthlyFeesService } from "./monthly-fees.service";
import { R2StorageService } from "./r2-storage.service";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [MonthlyFeesController],
  providers: [MonthlyFeesService, FeeGenerationService, R2StorageService],
  exports: [MonthlyFeesService, FeeGenerationService],
})
export class MonthlyFeesModule {}
