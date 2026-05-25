import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CsvController } from "./csv.controller";
import { CsvService } from "./csv.service";
import { ImportPreviewStore } from "./import-preview-store";

@Module({
  imports: [DatabaseModule],
  controllers: [CsvController],
  providers: [CsvService, ImportPreviewStore],
})
export class CsvModule {}
