import {
  csvImportConfirmResponseSchema,
  csvImportConfirmSchema,
  csvImportPreviewResponseSchema,
  csvImportPreviewSchema,
} from "@appdosensei/contracts";
import { createZodDto } from "nestjs-zod";

export class CsvImportPreviewDto extends createZodDto(csvImportPreviewSchema) {}
export class CsvImportPreviewResponseDto extends createZodDto(csvImportPreviewResponseSchema) {}
export class CsvImportConfirmDto extends createZodDto(csvImportConfirmSchema) {}
export class CsvImportConfirmResponseDto extends createZodDto(csvImportConfirmResponseSchema) {}
