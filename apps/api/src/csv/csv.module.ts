import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CsvController } from "./csv.controller";
import { CsvService } from "./csv.service";

@Module({
  imports: [DatabaseModule],
  controllers: [CsvController],
  providers: [CsvService],
})
export class CsvModule {}
