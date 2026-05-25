import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CsvController } from "./csv.controller";
import { CsvService } from "./csv.service";
import { IMPORT_PREVIEW_STORE, ImportPreviewStore } from "./import-preview-store";

@Module({
  imports: [DatabaseModule],
  controllers: [CsvController],
  providers: [CsvService, { provide: IMPORT_PREVIEW_STORE, useClass: ImportPreviewStore }],
})
export class CsvModule {}
