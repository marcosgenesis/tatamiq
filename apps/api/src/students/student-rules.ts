import { BadRequestException } from "@nestjs/common";

type GuardianInput = {
  name?: string | null;
  phone?: string | null;
};

type StudentRuleInput = {
  birthDate: string;
  guardian?: GuardianInput | null;
};

export function validateStudentInput(input: StudentRuleInput, today = new Date()): void {
  if (!isMinor(input.birthDate, today)) return;

  const guardianName = input.guardian?.name?.trim();
  const guardianPhone = input.guardian?.phone?.trim();

  if (!guardianName || !guardianPhone) {
    throw new BadRequestException(
      "Aluno menor de idade precisa de responsável com nome e telefone.",
    );
  }
}

export function isMinor(birthDate: string, today = new Date()): boolean {
  const birth = parseDateOnly(birthDate);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let age = current.getFullYear() - birth.getFullYear();
  const hasBirthdayPassedThisYear =
    current.getMonth() > birth.getMonth() ||
    (current.getMonth() === birth.getMonth() && current.getDate() >= birth.getDate());

  if (!hasBirthdayPassedThisYear) {
    age -= 1;
  }

  return age < 18;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
