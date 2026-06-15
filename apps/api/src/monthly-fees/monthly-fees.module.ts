import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AcademiaScopeModule } from "../academy-scope/academia-scope.module";
import { DatabaseModule } from "../database/database.module";
import { E2eR2Controller } from "./e2e-r2.controller";
import { FeeGenerationService } from "./fee-generation.service";
import { MonthlyFeeLifecycle } from "./monthly-fee-lifecycle";
import { MonthlyFeesController } from "./monthly-fees.controller";
import { MonthlyFeesService } from "./monthly-fees.service";
import { FakeR2StorageService, R2StorageService, RealR2StorageService } from "./r2-storage.service";

@Module({
  imports: [AcademiaScopeModule, DatabaseModule, ScheduleModule.forRoot()],
  controllers: [MonthlyFeesController, ...(process.env.E2E === "true" ? [E2eR2Controller] : [])],
  providers: [
    MonthlyFeesService,
    MonthlyFeeLifecycle,
    FeeGenerationService,
    {
      provide: R2StorageService,
      useFactory: () =>
        process.env.E2E === "true" ? new FakeR2StorageService() : new RealR2StorageService(),
    },
  ],
  exports: [MonthlyFeesService, FeeGenerationService, R2StorageService],
})
export class MonthlyFeesModule {}
