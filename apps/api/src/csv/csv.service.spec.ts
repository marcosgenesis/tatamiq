import { studentGuardians, students } from "@tatamiq/database";
import { describe, expect, it, vi } from "vitest";
import { CsvService } from "./csv.service";
import { ImportPreviewStore } from "./import-preview-store";

function createSelectChain<T>(result: T) {
  const chain = Promise.resolve(result) as Promise<T> & {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    innerJoin: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };

  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);

  return chain;
}

describe("CsvService", () => {
  it("returns one valid line and a preview token for a valid import row", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([{ id: "belt-1", name: "Branca" }]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([])),
    };
    const service = new CsvService(db as never, new ImportPreviewStore());

    const preview = await service.previewImport(
      "org-1",
      [
        "Nome,Data Nascimento,Data Matrícula,Email,Telefone,Faixa,Grau,Valor Mensal,Dia Vencimento,Responsável Nome,Responsável Telefone,Responsável Email,Parentesco",
        "João Silva,2000-05-20,2026-05-26,joao@email.com,11999999999,Branca,0,150.00,10,,,,",
      ].join("\n"),
    );

    expect(preview.totalLines).toBe(1);
    expect(preview.validLines).toBe(1);
    expect(preview.errorLines).toBe(0);
    expect(preview.previewToken).toEqual(expect.any(String));
    expect(preview.previewToken.length).toBeGreaterThan(0);
    expect(preview.lines).toEqual([
      {
        line: 2,
        name: "João Silva",
        errors: [],
        warnings: [],
      },
    ]);
  });

  it("errors when a minor student has no guardian name and phone", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([{ id: "belt-1", name: "Branca" }]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([])),
    };
    const service = new CsvService(db as never, new ImportPreviewStore());

    const preview = await service.previewImport(
      "org-1",
      [
        "Nome,Data Nascimento,Data Matrícula,Email,Telefone,Faixa,Grau",
        "Maria Silva,2012-05-20,2026-05-26,maria@email.com,11999999999,Branca,0",
      ].join("\n"),
    );

    expect(preview.validLines).toBe(0);
    expect(preview.lines[0]?.errors).toContain(
      "Aluno menor de idade precisa de responsável com nome e telefone.",
    );
  });

  it("errors when the CSV references an unknown belt", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([{ id: "belt-1", name: "Branca" }]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([])),
    };
    const service = new CsvService(db as never, new ImportPreviewStore());

    const preview = await service.previewImport(
      "org-1",
      [
        "Nome,Data Nascimento,Data Matrícula,Email,Telefone,Faixa,Grau",
        "João Silva,2000-05-20,2026-05-26,joao@email.com,11999999999,Azul,0",
      ].join("\n"),
    );

    expect(preview.validLines).toBe(0);
    expect(preview.lines[0]?.errors).toContain("Faixa 'Azul' não encontrada.");
  });

  it("treats an existing student email as an import-blocking error", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([{ id: "belt-1", name: "Branca" }]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([{ email: "existing@email.com" }])),
    };
    const service = new CsvService(db as never, new ImportPreviewStore());

    const preview = await service.previewImport(
      "org-1",
      [
        "Nome,Data Nascimento,Data Matrícula,Email,Telefone,Faixa,Grau",
        "João Silva,2000-05-20,2026-05-26, Existing@Email.com ,11999999999,Branca,0",
      ].join("\n"),
    );

    expect(preview.validLines).toBe(0);
    expect(preview.lines[0]?.errors).toContain("Email já cadastrado em outro aluno.");
    expect(preview.lines[0]?.warnings).toEqual([]);
  });

  it("errors on duplicate emails inside the same CSV file", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([{ id: "belt-1", name: "Branca" }]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([])),
    };
    const service = new CsvService(db as never, new ImportPreviewStore());

    const preview = await service.previewImport(
      "org-1",
      [
        "Nome,Data Nascimento,Data Matrícula,Email,Telefone,Faixa,Grau",
        "João Silva,2000-05-20,2026-05-26,dupe@email.com,11999999999,Branca,0",
        "Maria Silva,2001-06-21,2026-05-26, DUPE@email.com ,11888888888,Branca,0",
      ].join("\n"),
    );

    expect(preview.validLines).toBe(1);
    expect(preview.lines[1]?.errors).toContain("Email duplicado no arquivo CSV.");
  });

  it("exports attendance rows with the same number of columns as the header", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        createSelectChain([
          {
            attendance: {
              createdAt: new Date("2026-06-01T10:00:00.000Z"),
              source: "manual",
              invalidatedAt: null,
            },
            studentName: "João Silva",
            classGroupName: "Adulto",
          },
        ]),
      ),
    };
    const service = new CsvService(db as never, new ImportPreviewStore());

    const csv = await service.exportAttendances("org-1", {});
    const [header, row] = csv.replace(/^\uFEFF/, "").split("\n");

    expect(header?.split(",")).toEqual(["Data", "Aluno", "Turma", "Fonte", "Invalidada"]);
    expect(row?.split(",")).toHaveLength(header?.split(",").length ?? 0);
    expect(row?.split(",")).toEqual(["2026-06-01", "João Silva", "Adulto", "manual", "Não"]);
  });

  it("confirms imports inside a transaction and inserts student plus guardian data", async () => {
    const previewStore = new ImportPreviewStore();
    previewStore.save("preview-1", {
      organizationId: "org-1",
      rows: [
        {
          line: 2,
          name: "João Silva",
          birthDate: "2012-05-20",
          enrollmentDate: "2026-05-26",
          status: "active",
          email: "joao@email.com",
          phone: "11999999999",
          beltName: "Branca",
          degree: 0,
          monthlyAmount: 15000,
          monthlyDueDay: 10,
          guardianName: "Maria Silva",
          guardianPhone: "11888888888",
          guardianEmail: "maria@email.com",
          guardianRelationship: "Mãe",
          errors: [],
          warnings: [],
        },
      ],
    });

    const insertedStudents: Array<Record<string, unknown>> = [];
    const insertedGuardians: Array<Record<string, unknown>> = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createSelectChain([{ id: "belt-1", name: "Branca", path: "adult", position: 0 }]),
        ),
      insert: vi.fn((table) => ({
        values: vi.fn(async (value) => {
          if (table === students) insertedStudents.push(value as Record<string, unknown>);
          if (table === studentGuardians) insertedGuardians.push(value as Record<string, unknown>);
        }),
      })),
    };
    const db = {
      insert: vi.fn(),
      transaction: vi.fn(async (callback) => callback(tx)),
    };
    const service = new CsvService(db as never, previewStore);

    await expect(service.confirmImport("org-1", "preview-1")).resolves.toEqual({
      imported: 1,
      skipped: 0,
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
    expect(tx.insert).toHaveBeenCalledWith(students);
    expect(tx.insert).toHaveBeenCalledWith(studentGuardians);
    expect(insertedStudents[0]).toMatchObject({
      organizationId: "org-1",
      name: "João Silva",
      email: "joao@email.com",
      currentBeltId: "belt-1",
    });
    expect(insertedGuardians[0]).toMatchObject({
      name: "Maria Silva",
      phone: "11888888888",
      email: "maria@email.com",
      relationship: "Mãe",
    });
    expect(previewStore.get("preview-1")).toBeUndefined();
  });

  it("propagates transaction failures and keeps the preview token available for retry", async () => {
    const previewStore = new ImportPreviewStore();
    previewStore.save("preview-2", {
      organizationId: "org-1",
      rows: [
        {
          line: 2,
          name: "João Silva",
          birthDate: "2012-05-20",
          enrollmentDate: "2026-05-26",
          status: "active",
          email: "joao@email.com",
          phone: "11999999999",
          beltName: "Branca",
          degree: 0,
          monthlyAmount: 15000,
          monthlyDueDay: 10,
          guardianName: "Maria Silva",
          guardianPhone: "11888888888",
          guardianEmail: "maria@email.com",
          guardianRelationship: "Mãe",
          errors: [],
          warnings: [],
        },
      ],
    });

    const expectedError = new Error("guardian insert failed");
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createSelectChain([{ id: "belt-1", name: "Branca", path: "adult", position: 0 }]),
        ),
      insert: vi.fn((table) => ({
        values: vi.fn(async () => {
          if (table === studentGuardians) throw expectedError;
        }),
      })),
    };
    const db = {
      insert: vi.fn(),
      transaction: vi.fn(async (callback) => callback(tx)),
    };
    const service = new CsvService(db as never, previewStore);

    await expect(service.confirmImport("org-1", "preview-2")).rejects.toBe(expectedError);

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
    expect(previewStore.get("preview-2")).toBeDefined();
  });
});
