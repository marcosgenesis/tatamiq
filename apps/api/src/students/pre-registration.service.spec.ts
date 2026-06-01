import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreRegistrationService } from "./pre-registration.service";

type MockRow = Record<string, unknown>;

function createMockDb() {
  const insertedRows: MockRow[] = [];
  const updatedSets: MockRow[] = [];
  let selectResults: MockRow[][] = [];
  let updateResults: MockRow[][] = [];
  let selectCallIndex = 0;
  let updateCallIndex = 0;

  function nextSelectResult() {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  }

  const db = {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((values) => {
        insertedRows.push(values);
        return {
          returning: vi.fn().mockResolvedValue([values]),
        };
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((setValues) => ({
        where: vi.fn().mockImplementation(() => {
          updatedSets.push(setValues);
          return {
            returning: vi.fn().mockImplementation(() => {
              const result = updateResults[updateCallIndex] ?? [setValues];
              updateCallIndex++;
              return Promise.resolve(result);
            }),
          };
        }),
      })),
    })),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockImplementation(nextSelectResult),
        limit: vi.fn().mockImplementation(nextSelectResult),
      }),
    })),
  };

  return {
    db,
    insertedRows,
    updatedSets,
    setSelectResults: (results: MockRow[][]) => {
      selectResults = results;
      selectCallIndex = 0;
    },
    setUpdateResults: (results: MockRow[][]) => {
      updateResults = results;
      updateCallIndex = 0;
    },
  };
}

const linkRow = {
  id: "link-1",
  organizationId: "academy-1",
  token: "public-token",
  status: "active",
  regeneratedAt: null,
  createdAt: new Date("2026-05-27T00:00:00.000Z"),
  updatedAt: new Date("2026-05-27T00:00:00.000Z"),
};

const academyRow = {
  id: "academy-1",
  name: "Tatame Central",
  logo: null,
  address: null,
  phone: null,
  instagram: null,
};

const requestRow = {
  id: "request-1",
  organizationId: "academy-1",
  linkId: "link-1",
  status: "pending_review",
  name: "Aluno Teste",
  birthDate: "2000-01-01",
  phone: "11999999999",
  email: "aluno@example.com",
  guardianName: null,
  guardianPhone: null,
  note: null,
  consentAcceptedAt: new Date("2026-05-27T00:00:00.000Z"),
  reviewedByUserId: null,
  reviewedAt: null,
  rejectionReason: null,
  approvedStudentId: null,
  approvedStudentAccessId: null,
  duplicateStudentId: null,
  firstAccessTokenHash: null,
  firstAccessTokenExpiresAt: null,
  firstAccessTokenConsumedAt: null,
  firstAccessEmailSentAt: null,
  createdAt: new Date("2026-05-27T00:00:00.000Z"),
  updatedAt: new Date("2026-05-27T00:00:00.000Z"),
};

describe("PreRegistrationService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: PreRegistrationService;

  beforeEach(() => {
    mock = createMockDb();
    service = new PreRegistrationService(
      mock.db as never,
      { send: vi.fn() } as never,
      { completeActivation: vi.fn() } as never,
      {
        getOrCreateLink: vi.fn(),
        pauseLink: vi.fn(),
        reactivateLink: vi.fn(),
        regenerateLink: vi.fn(),
        resolvePublicProfile: vi.fn(),
      } as never,
    );
  });

  it("creates a public Solicitação de Pré-Cadastro through an active link", async () => {
    mock.setSelectResults([[{ link: linkRow, academy: academyRow }], [], [], []]);

    const result = await service.createRequest("public-token", {
      name: "  Aluno Teste  ",
      birthDate: "2000-01-01",
      phone: " 11999999999 ",
      email: "ALUNO@example.com",
      guardianName: "",
      guardianPhone: "",
      note: " Quero treinar ",
      consentAccepted: true,
    });

    expect(result.status).toBe("pending_review");
    expect(result.email).toBe("aluno@example.com");
    expect(result.name).toBe("Aluno Teste");
    expect(result.note).toBe("Quero treinar");
    expect(mock.insertedRows[0]).toMatchObject({
      organizationId: "academy-1",
      linkId: "link-1",
      status: "pending_review",
      consentAcceptedAt: expect.any(Date),
    });
  });

  it("requires Consentimento de Pré-Cadastro", async () => {
    mock.setSelectResults([[{ link: linkRow, academy: academyRow }]]);

    await expect(
      service.createRequest("public-token", {
        name: "Aluno Teste",
        birthDate: "2000-01-01",
        phone: "11999999999",
        email: "aluno@example.com",
        consentAccepted: false as true,
      }),
    ).rejects.toThrow("Consentimento de pré-cadastro é obrigatório.");
  });

  it("requires Responsável information for a minor request", async () => {
    mock.setSelectResults([[{ link: linkRow, academy: academyRow }]]);

    await expect(
      service.createRequest("public-token", {
        name: "Aluno Mirim",
        birthDate: "2015-01-01",
        phone: "11999999999",
        email: "mirim@example.com",
        consentAccepted: true,
      }),
    ).rejects.toThrow("Menor de idade precisa de responsável com nome e telefone.");
  });

  it("blocks duplicate pending or approved requests by email", async () => {
    mock.setSelectResults([[{ link: linkRow, academy: academyRow }], [{ id: "existing" }]]);

    await expect(
      service.createRequest("public-token", {
        name: "Aluno Teste",
        birthDate: "2000-01-01",
        phone: "11999999999",
        email: "ALUNO@example.com",
        consentAccepted: true,
      }),
    ).rejects.toThrow("Já existe uma solicitação em análise para este email.");
  });

  it("enriches the instructor queue with summary, duplicate student, and instructor-account warnings", async () => {
    const duplicateRequest = {
      ...requestRow,
      duplicateStudentId: "student-1",
      email: "instrutor@example.com",
    };
    mock.setSelectResults([
      [{ request: duplicateRequest, duplicateName: "Aluno Teste" }],
      [{ id: "user-1", email: "instrutor@example.com", name: "Instrutor" }],
      [{ id: "member-1" }],
      [],
    ]);

    const result = await service.listRequests("academy-1");

    expect(result.summary).toEqual({ pendingReview: 1, approved: 0, rejected: 0 });
    expect(result.requests[0]).toMatchObject({
      duplicateStudent: { id: "student-1", name: "Aluno Teste" },
      isInstructorAccount: true,
      duplicateStudentHasActiveAccess: false,
    });
  });

  it("rejects a pending request with an optional internal reason", async () => {
    const rejected = {
      ...requestRow,
      status: "rejected",
      reviewedByUserId: "owner-1",
      reviewedAt: new Date("2026-05-27T01:00:00.000Z"),
      rejectionReason: "Duplicado",
    };
    mock.setSelectResults([[requestRow], []]);
    mock.setUpdateResults([[rejected]]);

    const result = await service.rejectRequest("academy-1", "request-1", "owner-1", {
      reason: " Duplicado ",
    });

    expect(mock.updatedSets[0]).toMatchObject({
      status: "rejected",
      reviewedByUserId: "owner-1",
      rejectionReason: "Duplicado",
    });
    expect(result.status).toBe("rejected");
    expect(result.rejectionReason).toBe("Duplicado");
  });
});
