import { randomBytes } from "node:crypto";
import { BadRequestException } from "@nestjs/common";

export function parseLinkStatus(value: string): "active" | "paused" {
  if (value === "active" || value === "paused") return value;
  throw new BadRequestException("Status do link de pré-cadastro inválido.");
}

export function createLinkToken(): string {
  return randomBytes(24).toString("base64url");
}
