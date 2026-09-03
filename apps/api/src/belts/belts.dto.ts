import { beltSchema, listBeltsResponseSchema, updateBeltSchema } from "@appdosensei/contracts";
import { createZodDto } from "nestjs-zod";

export class BeltDto extends createZodDto(beltSchema) {}
export class ListBeltsResponseDto extends createZodDto(listBeltsResponseSchema) {}
export class UpdateBeltDto extends createZodDto(updateBeltSchema) {}
