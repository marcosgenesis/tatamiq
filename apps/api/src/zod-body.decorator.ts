import { Body } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";

export function ZodBody(dto: unknown): ParameterDecorator {
  return Body(new ZodValidationPipe(dto as never));
}
