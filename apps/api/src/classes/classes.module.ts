import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ClassesController } from "./classes.controller";
import { ClassesService } from "./classes.service";
import { ClassesExpiryService } from "./classes-expiry.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ClassesController],
  providers: [ClassesService, ClassesExpiryService],
  exports: [ClassesService],
})
export class ClassesModule {}
