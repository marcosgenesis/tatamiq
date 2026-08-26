import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ClassesController } from "./classes.controller";
import { ClassesExpiryService } from "./classes-expiry.service";
import { ClassesService } from "./classes.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ClassesController],
  providers: [ClassesService, ClassesExpiryService],
  exports: [ClassesService],
})
export class ClassesModule {}
