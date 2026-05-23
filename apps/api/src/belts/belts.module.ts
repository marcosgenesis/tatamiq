import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BeltsController } from "./belts.controller";
import { BeltsService } from "./belts.service";

@Module({
  imports: [DatabaseModule],
  controllers: [BeltsController],
  providers: [BeltsService],
  exports: [BeltsService],
})
export class BeltsModule {}
