import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { R2StorageService } from "../monthly-fees/r2-storage.service";
import { AcademyController } from "./academy.controller";
import { AcademyService } from "./academy.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AcademyController],
  providers: [AcademyService, R2StorageService],
})
export class AcademyModule {}
