import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CsvImportConfirmResponse, CsvImportPreviewResponse } from "@tatamiq/contracts";
import {
  attendances,
  belts,
  classGroups,
  classSessions,
  type Database,
  monthlyFees,
  studentGuardians,
  students,
} from "@tatamiq/database";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { isMinor } from "../students/student-rules";
import type { ImportPreviewStore, ParsedStudentRow } from "./import-preview-store";
import { IMPORT_PREVIEW_STORE } from "./import-preview-store";

const BOM = "﻿";
const STUDENT_IMPORT_TEMPLATE_HEADER =
  "Nome,Data Nascimento,Data Matrícula,Email,Telefone,Faixa,Grau,Valor Mensal,Dia Vencimento,Responsável Nome,Responsável Telefone,Responsável Email,Parentesco";
const STUDENT_IMPORT_TEMPLATE_EXAMPLE =
  "João Silva,2000-05-20,2026-05-26,joao@email.com,11999999999,Branca,0,150.00,10,,,,";

@Injectable()
export class CsvService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(IMPORT_PREVIEW_STORE) private readonly previewStore: ImportPreviewStore,
  ) {}

  studentImportTemplate(): string {
    return BOM + [STUDENT_IMPORT_TEMPLATE_HEADER, STUDENT_IMPORT_TEMPLATE_EXAMPLE].join("\n");
  }

  async previewImport(
    organizationId: string,
    csvContent: string,
  ): Promise<CsvImportPreviewResponse> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new BadRequestException("CSV vazio ou sem dados.");

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    const nameIdx = findHeader(headers, ["nome", "name"]);
    const birthIdx = findHeader(headers, ["data nascimento", "data de nascimento", "birthdate"]);
    const enrollIdx = findHeader(headers, [
      "data matricula",
      "data de matricula",
      "enrollmentdate",
    ]);
    const emailIdx = findHeader(headers, ["email", "e-mail"]);
    const phoneIdx = findHeader(headers, ["telefone", "phone"]);
    const beltIdx = findHeader(headers, ["faixa", "belt"]);
    const degreeIdx = findHeader(headers, ["grau", "degree"]);
    const amountIdx = findHeader(headers, ["valor mensal", "monthlyamount"]);
    const dueDayIdx = findHeader(headers, ["dia vencimento", "dia de vencimento", "monthlydueday"]);
    const guardianNameIdx = findHeader(headers, ["responsavel nome", "nome responsavel"]);
    const guardianPhoneIdx = findHeader(headers, ["responsavel telefone", "telefone responsavel"]);
    const guardianEmailIdx = findHeader(headers, ["responsavel email", "email responsavel"]);
    const guardianRelationshipIdx = findHeader(headers, ["parentesco", "responsavel parentesco"]);

    if (nameIdx === -1) throw new BadRequestException("Coluna 'Nome' obrigatória.");

    const academyBelts = await this.db
      .select()
      .from(belts)
      .where(eq(belts.organizationId, organizationId));
    const beltsByName = new Map(academyBelts.map((b) => [b.name.toLowerCase(), b]));

    const existingStudents = await this.db
      .select({ name: students.name, birthDate: students.birthDate })
      .from(students)
      .where(eq(students.organizationId, organizationId));
    const existingSet = new Set(
      existingStudents.map((s) => `${s.name.toLowerCase()}:${s.birthDate}`),
    );

    const existingEmails = await this.db
      .select({ email: students.email })
      .from(students)
      .where(and(eq(students.organizationId, organizationId), sql`${students.email} IS NOT NULL`));
    const emailSet = new Set(existingEmails.map((s) => s.email?.toLowerCase()).filter(Boolean));

    const rows: ParsedStudentRow[] = [];
    const csvEmailSet = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const errors: string[] = [];
      const warnings: string[] = [];

      const name = cols[nameIdx]?.trim() ?? "";
      const birthDate = cols[birthIdx]?.trim() ?? "";
      const enrollmentDate = cols[enrollIdx]?.trim() ?? new Date().toISOString().split("T")[0];
      const email = cols[emailIdx]?.trim() ?? "";
      const phone = cols[phoneIdx]?.trim() ?? "";
      const beltName = cols[beltIdx]?.trim() ?? "";
      const degree = Number.parseInt(cols[degreeIdx]?.trim() ?? "0", 10) || 0;
      const monthlyAmount =
        amountIdx >= 0 ? parseMonthlyAmount(cols[amountIdx]?.trim() ?? "") : null;
      const monthlyDueDay =
        dueDayIdx >= 0 ? Number.parseInt(cols[dueDayIdx]?.trim() ?? "", 10) || null : null;
      const guardianName = cols[guardianNameIdx]?.trim() ?? "";
      const guardianPhone = cols[guardianPhoneIdx]?.trim() ?? "";
      const guardianEmail = cols[guardianEmailIdx]?.trim() ?? "";
      const guardianRelationship = cols[guardianRelationshipIdx]?.trim() ?? "";

      if (!name) errors.push("Nome obrigatório.");
      if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        errors.push("Data de nascimento inválida (YYYY-MM-DD).");
      } else if (isMinor(birthDate) && (!guardianName || !guardianPhone)) {
        errors.push("Aluno menor de idade precisa de responsável com nome e telefone.");
      }
      if (monthlyAmount !== null && Number.isNaN(monthlyAmount))
        errors.push("Valor mensal inválido.");
      if (monthlyDueDay !== null && (monthlyDueDay < 1 || monthlyDueDay > 31)) {
        errors.push("Dia de vencimento deve ser entre 1 e 31.");
      }
      if (beltName && !beltsByName.has(beltName.toLowerCase()))
        errors.push(`Faixa '${beltName}' não encontrada.`);
      if (name && birthDate && existingSet.has(`${name.toLowerCase()}:${birthDate}`)) {
        warnings.push("Aluno com mesmo nome e data de nascimento já existe.");
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail) {
        if (emailSet.has(normalizedEmail)) {
          errors.push("Email já cadastrado em outro aluno.");
        }
        if (csvEmailSet.has(normalizedEmail)) {
          errors.push("Email duplicado no arquivo CSV.");
        } else {
          csvEmailSet.add(normalizedEmail);
        }
      }

      rows.push({
        line: i + 1,
        name,
        birthDate,
        enrollmentDate,
        status: "active",
        email,
        phone,
        beltName,
        degree,
        monthlyAmount: monthlyAmount !== null && Number.isNaN(monthlyAmount) ? null : monthlyAmount,
        monthlyDueDay,
        guardianName,
        guardianPhone,
        guardianEmail,
        guardianRelationship,
        errors,
        warnings,
      });
    }

    const previewToken = crypto.randomUUID();
    this.previewStore.save(previewToken, { organizationId, rows });

    return {
      totalLines: rows.length,
      validLines: rows.filter((r) => r.errors.length === 0).length,
      errorLines: rows.filter((r) => r.errors.length > 0).length,
      previewToken,
      lines: rows.map((r) => ({
        line: r.line,
        name: r.name,
        errors: r.errors,
        warnings: r.warnings,
      })),
    };
  }

  async confirmImport(
    organizationId: string,
    previewToken: string,
  ): Promise<CsvImportConfirmResponse> {
    const preview = this.previewStore.get(previewToken);
    if (!preview || preview.organizationId !== organizationId) {
      throw new NotFoundException("Preview não encontrado ou expirado.");
    }

    const result = await this.db.transaction(async (tx) => {
      const academyBelts = await tx
        .select()
        .from(belts)
        .where(eq(belts.organizationId, organizationId));
      const beltsByName = new Map(academyBelts.map((b) => [b.name.toLowerCase(), b]));
      const defaultBelt = academyBelts.find((b) => b.path === "adult" && b.position === 0);

      let imported = 0;
      let skipped = 0;

      for (const row of preview.rows) {
        if (row.errors.length > 0) {
          skipped++;
          continue;
        }

        const belt = beltsByName.get(row.beltName.toLowerCase()) ?? defaultBelt;
        if (!belt) {
          skipped++;
          continue;
        }

        const studentId = crypto.randomUUID();
        await tx.insert(students).values({
          id: studentId,
          organizationId,
          name: row.name,
          birthDate: row.birthDate,
          enrollmentDate: row.enrollmentDate,
          status: "active",
          email: row.email || null,
          phone: row.phone || null,
          currentBeltId: belt.id,
          currentDegree: row.degree,
          monthlyAmountInCents: row.monthlyAmount,
          monthlyDueDay: row.monthlyDueDay,
        });

        if (row.guardianName && row.guardianPhone) {
          await tx.insert(studentGuardians).values({
            id: crypto.randomUUID(),
            studentId,
            name: row.guardianName,
            phone: row.guardianPhone,
            email: row.guardianEmail || null,
            relationship: row.guardianRelationship || null,
          });
        }
        imported++;
      }

      return { imported, skipped };
    });

    this.previewStore.delete(previewToken);

    return result;
  }

  async exportStudents(organizationId: string): Promise<string> {
    const rows = await this.db
      .select({
        student: students,
        beltName: belts.name,
        beltPath: belts.path,
      })
      .from(students)
      .leftJoin(belts, eq(students.currentBeltId, belts.id))
      .where(eq(students.organizationId, organizationId))
      .orderBy(students.name);

    const header =
      "Nome,Data Nascimento,Data Matrícula,Status,Email,Telefone,Faixa,Grau,Valor Mensal,Dia Vencimento";
    const csvLines = rows.map((r) =>
      [
        escapeCsv(r.student.name),
        r.student.birthDate,
        r.student.enrollmentDate,
        r.student.status,
        escapeCsv(r.student.email ?? ""),
        escapeCsv(r.student.phone ?? ""),
        escapeCsv(r.beltName ?? ""),
        r.student.currentDegree,
        r.student.monthlyAmountInCents ? (r.student.monthlyAmountInCents / 100).toFixed(2) : "",
        r.student.monthlyDueDay ?? "",
      ].join(","),
    );

    return BOM + [header, ...csvLines].join("\n");
  }

  async exportAttendances(
    organizationId: string,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      classGroupId?: string;
      studentId?: string;
    },
  ): Promise<string> {
    const conditions = [eq(students.organizationId, organizationId)];
    if (filters.studentId) conditions.push(eq(attendances.studentId, filters.studentId));
    if (filters.dateFrom) conditions.push(gte(attendances.createdAt, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(sql`${attendances.createdAt} < ${endDate}`);
    }
    if (filters.classGroupId) {
      conditions.push(eq(classSessions.classGroupId, filters.classGroupId));
    }

    const rows = await this.db
      .select({
        attendance: attendances,
        studentName: students.name,
        classGroupName: classGroups.name,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.studentId, students.id))
      .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
      .innerJoin(classGroups, eq(classSessions.classGroupId, classGroups.id))
      .where(and(...conditions))
      .orderBy(desc(attendances.createdAt));

    const header = "Data,Aluno,Turma,Fonte,Invalidada";
    const csvLines = rows.map((r) =>
      [
        r.attendance.createdAt.toISOString().split("T")[0],
        escapeCsv(r.studentName),
        escapeCsv(r.classGroupName),
        r.attendance.source,
        r.attendance.invalidatedAt ? "Sim" : "Não",
      ].join(","),
    );

    return BOM + [header, ...csvLines].join("\n");
  }

  async exportMonthlyFees(
    organizationId: string,
    filters: {
      status?: string;
      referenceYear?: number;
      referenceMonth?: number;
      studentId?: string;
    },
  ): Promise<string> {
    const conditions = [eq(students.organizationId, organizationId)];
    if (filters.studentId) conditions.push(eq(monthlyFees.studentId, filters.studentId));
    if (filters.status) conditions.push(eq(monthlyFees.status, filters.status));
    if (filters.referenceYear)
      conditions.push(eq(monthlyFees.referenceYear, filters.referenceYear));
    if (filters.referenceMonth)
      conditions.push(eq(monthlyFees.referenceMonth, filters.referenceMonth));

    const rows = await this.db
      .select({
        fee: monthlyFees,
        studentName: students.name,
      })
      .from(monthlyFees)
      .innerJoin(students, eq(monthlyFees.studentId, students.id))
      .where(and(...conditions))
      .orderBy(desc(monthlyFees.dueDate));

    const today = new Date().toISOString().split("T")[0];
    const header = "Aluno,Ano,Mês,Valor,Valor Original,Vencimento,Status,Atrasada,Pago Em";
    const csvLines = rows.map((r) => {
      const overdue = r.fee.status === "open" && r.fee.dueDate < today;
      return [
        escapeCsv(r.studentName),
        r.fee.referenceYear,
        r.fee.referenceMonth,
        (r.fee.amountInCents / 100).toFixed(2),
        r.fee.originalAmountInCents ? (r.fee.originalAmountInCents / 100).toFixed(2) : "",
        r.fee.dueDate,
        r.fee.status,
        overdue ? "Sim" : "Não",
        r.fee.paidAt?.toISOString().split("T")[0] ?? "",
      ].join(",");
    });

    return BOM + [header, ...csvLines].join("\n");
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function findHeader(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(header));
}

function parseMonthlyAmount(value: string): number | null {
  if (!value) return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount) || amount < 0) return Number.NaN;
  return Math.round(amount * 100);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
