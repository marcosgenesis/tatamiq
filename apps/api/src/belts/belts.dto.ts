import { beltSchema, listBeltsResponseSchema } from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class BeltDto extends createZodDto(beltSchema) {}
export class ListBeltsResponseDto extends createZodDto(listBeltsResponseSchema) {}
