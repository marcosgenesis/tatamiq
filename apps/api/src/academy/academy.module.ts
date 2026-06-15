import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MonthlyFeesModule } from "../monthly-fees/monthly-fees.module";
import { AcademyController } from "./academy.controller";
import { AcademyService } from "./academy.service";

@Module({
  imports: [DatabaseModule, MonthlyFeesModule],
  controllers: [AcademyController],
  providers: [AcademyService],
})
export class AcademyModule {}
