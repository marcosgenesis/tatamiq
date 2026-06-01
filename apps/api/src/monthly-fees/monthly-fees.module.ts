import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "../database/database.module";
import { FeeGenerationService } from "./fee-generation.service";
import { MonthlyFeeLifecycle } from "./monthly-fee-lifecycle";
import { MonthlyFeesController } from "./monthly-fees.controller";
import { MonthlyFeesService } from "./monthly-fees.service";
import { R2StorageService } from "./r2-storage.service";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [MonthlyFeesController],
  providers: [MonthlyFeesService, MonthlyFeeLifecycle, FeeGenerationService, R2StorageService],
  exports: [MonthlyFeesService, FeeGenerationService, R2StorageService],
})
export class MonthlyFeesModule {}
