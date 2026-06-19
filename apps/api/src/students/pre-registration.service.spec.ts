import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PreRegistrationService,
  resetPreRegistrationThrottleForTests,
} from "./pre-registration.service";

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

  const db: Record<string, unknown> = {
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

  db.transaction = vi.fn().mockImplementation(async (callback) => callback(db));

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

const whiteBeltRow = {
  id: "belt-white",
  organizationId: "academy-1",
  slug: "adult-white",
  name: "Branca",
};

function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

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
  firstAccessConsumedAt: null,
  firstAccessEmailSentAt: null,
  createdAt: new Date("2026-05-27T00:00:00.000Z"),
  updatedAt: new Date("2026-05-27T00:00:00.000Z"),
};

describe("PreRegistrationService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: PreRegistrationService;
  let emailService: { send: ReturnType<typeof vi.fn> };
  let activationService: { activate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    resetPreRegistrationThrottleForTests();
    mock = createMockDb();
    emailService = { send: vi.fn() };
    activationService = { activate: vi.fn().mockResolvedValue({ accessId: "access-1" }) };
    service = new PreRegistrationService(
      mock.db as never,
      emailService as never,
      activationService as never,
      {
        getOrCreateLink: vi.fn(),
        pauseLink: vi.fn(),
        reactivateLink: vi.fn(),
        regenerateLink: vi.fn(),
        resolvePublicProfile: vi.fn(),
        resolveActiveLink: vi
          .fn()
          .mockResolvedValue({ linkId: linkRow.id, organizationId: linkRow.organizationId }),
      } as never,
    );
  });

  it("creates a public Solicitação de Pré-Cadastro through an active link", async () => {
    mock.setSelectResults([[], []]);

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

  it("blocks repeated public submissions for the same email within the throttle window", async () => {
    mock.setSelectResults(Array.from({ length: 6 }, () => []));

    for (let index = 0; index < 3; index++) {
      await service.createRequest("public-token", {
        name: `Aluno ${index}`,
        birthDate: "2000-01-01",
        phone: "11999999999",
        email: "throttled@example.com",
        consentAccepted: true,
      });
    }

    await expect(
      service.createRequest("public-token", {
        name: "Aluno Bloqueado",
        birthDate: "2000-01-01",
        phone: "11999999999",
        email: "throttled@example.com",
        consentAccepted: true,
      }),
    ).rejects.toThrow("Muitas tentativas de pré-cadastro");
  });

  it("blocks repeated public submissions from the same IP within the throttle window", async () => {
    mock.setSelectResults(Array.from({ length: 40 }, () => []));

    for (let index = 0; index < 20; index++) {
      await service.createRequest(
        "public-token",
        {
          name: `Aluno ${index}`,
          birthDate: "2000-01-01",
          phone: "11999999999",
          email: `ip-${index}@example.com`,
          consentAccepted: true,
        },
        "203.0.113.20",
      );
    }

    await expect(
      service.createRequest(
        "public-token",
        {
          name: "Aluno Bloqueado",
          birthDate: "2000-01-01",
          phone: "11999999999",
          email: "ip-blocked@example.com",
          consentAccepted: true,
        },
        "203.0.113.20",
      ),
    ).rejects.toThrow("Muitas tentativas de pré-cadastro");
  });

  it("requires Consentimento de Pré-Cadastro", async () => {
    mock.setSelectResults([]);

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
    mock.setSelectResults([]);

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
    mock.setSelectResults([[{ id: "existing" }]]);

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

  it("approves a non-duplicate request by creating Aluno, access, and first-access link", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T12:00:00.000Z"));
    try {
      const approvedRow = {
        ...requestRow,
        status: "approved",
        reviewedByUserId: "owner-1",
        reviewedAt: new Date("2026-05-27T12:00:00.000Z"),
        approvedStudentId: "student-new",
        approvedStudentAccessId: "access-1",
      };
      mock.setSelectResults([[requestRow], [whiteBeltRow], [], [approvedRow], [], []]);

      const result = await service.approveRequest("academy-1", "request-1", "owner-1", {});

      expect(mock.insertedRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            organizationId: "academy-1",
            name: "Aluno Teste",
            enrollmentDate: "2026-05-27",
            status: "active",
            currentBeltId: "belt-white",
            currentDegree: 0,
          }),
          expect.objectContaining({ providerId: "credential", password: null }),
        ]),
      );
      expect(activationService.activate).toHaveBeenCalledWith(expect.anything(), {
        organizationId: "academy-1",
        studentId: expect.any(String),
        authUserId: expect.any(String),
        termsVersion: expect.any(String),
      });
      expect(mock.updatedSets[0]).toMatchObject({
        status: "approved",
        reviewedByUserId: "owner-1",
        approvedStudentAccessId: "access-1",
        firstAccessTokenHash: expect.any(String),
        firstAccessTokenExpiresAt: new Date("2026-06-03T12:00:00.000Z"),
      });
      expect(result.request.status).toBe("approved");
      expect(result.firstAccessLink).toContain("/student/first-access/");
    } finally {
      vi.useRealTimers();
    }
  });

  it("links a duplicate request to an existing Aluno when access is not active", async () => {
    const duplicateRequest = { ...requestRow, duplicateStudentId: "student-existing" };
    const approvedRow = {
      ...duplicateRequest,
      status: "approved",
      approvedStudentId: "student-existing",
      approvedStudentAccessId: "access-1",
    };
    mock.setSelectResults([
      [duplicateRequest],
      [],
      [whiteBeltRow],
      [{ id: "auth-existing", email: "aluno@example.com", name: "Aluno Teste" }],
      [approvedRow],
      [{ id: "student-existing", name: "Aluno Teste" }],
      [{ id: "auth-existing", email: "aluno@example.com", name: "Aluno Teste" }],
      [],
      [],
    ]);

    const result = await service.approveRequest("academy-1", "request-1", "owner-1", {
      duplicateDecision: "link_to_existing",
    });

    expect(mock.insertedRows).toEqual([]);
    expect(activationService.activate).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "academy-1",
      studentId: "student-existing",
      authUserId: "auth-existing",
      termsVersion: expect.any(String),
    });
    expect(result.studentId).toBe("student-existing");
    expect(result.request.duplicateStudent).toEqual({
      id: "student-existing",
      name: "Aluno Teste",
    });
  });

  it("blocks linking a duplicate request when the existing Aluno already has active access", async () => {
    mock.setSelectResults([
      [{ ...requestRow, duplicateStudentId: "student-existing" }],
      [{ id: "access-existing" }],
    ]);

    await expect(
      service.approveRequest("academy-1", "request-1", "owner-1", {
        duplicateDecision: "link_to_existing",
      }),
    ).rejects.toThrow("Este aluno já possui acesso ativo. Não é possível vincular.");

    expect(activationService.activate).not.toHaveBeenCalled();
  });

  it("rejects a duplicate request without creating Aluno or access", async () => {
    const duplicateRequest = { ...requestRow, duplicateStudentId: "student-existing" };
    mock.setSelectResults([
      [duplicateRequest],
      [{ id: "student-existing", name: "Aluno Teste" }],
      [],
      [],
    ]);
    mock.setUpdateResults([
      [
        {
          ...duplicateRequest,
          status: "rejected",
          rejectionReason: "Rejeitada como duplicata.",
        },
      ],
    ]);

    const result = await service.approveRequest("academy-1", "request-1", "owner-1", {
      duplicateDecision: "reject_as_duplicate",
    });

    expect(mock.insertedRows).toEqual([]);
    expect(activationService.activate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      firstAccessLink: "",
      studentId: "",
      request: { status: "rejected", rejectionReason: "Rejeitada como duplicata." },
    });
  });

  it("routes new-account first access to sign-in after defining a password", async () => {
    mock.setSelectResults([
      [
        {
          request: { ...requestRow, firstAccessTokenExpiresAt: futureDate() },
          academy: academyRow,
        },
      ],
      [{ id: "auth-new", email: "aluno@example.com", name: "Aluno Teste" }],
      [{ password: null }],
    ]);

    const result = await service.completeFirstAccess("token", {
      password: "tatamiq456",
      termsAccepted: true,
      termsVersion: "student-access-v1",
    });

    expect(result).toEqual({ redirectTo: "sign-in" });
    expect(mock.updatedSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ password: expect.any(String) }),
        expect.objectContaining({ firstAccessConsumedAt: expect.any(Date) }),
      ]),
    );
  });

  it("routes existing-account first access to the student area", async () => {
    mock.setSelectResults([
      [
        {
          request: { ...requestRow, firstAccessTokenExpiresAt: futureDate() },
          academy: academyRow,
        },
      ],
      [{ id: "auth-existing", email: "aluno@example.com", name: "Aluno Teste" }],
      [{ password: "hashed_password" }],
    ]);

    const result = await service.completeFirstAccess("token", {
      termsAccepted: true,
      termsVersion: "student-access-v1",
    });

    expect(result).toEqual({ redirectTo: "student" });
    expect(mock.updatedSets).toEqual([
      expect.objectContaining({ firstAccessConsumedAt: expect.any(Date) }),
    ]);
  });

  it("generates a fresh first-access link for approved requests", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T12:00:00.000Z"));
    try {
      mock.setSelectResults([
        [{ ...requestRow, status: "approved", firstAccessConsumedAt: new Date() }],
      ]);

      const result = await service.generateFirstAccessLink("academy-1", "request-1");

      expect(result.firstAccessLink).toContain("/student/first-access/");
      expect(mock.updatedSets[0]).toMatchObject({
        firstAccessTokenHash: expect.any(String),
        firstAccessTokenExpiresAt: new Date("2026-06-03T12:00:00.000Z"),
        firstAccessConsumedAt: null,
      });
      expect(emailService.send).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects first-access link generation for non-approved requests", async () => {
    mock.setSelectResults([[requestRow]]);

    await expect(service.generateFirstAccessLink("academy-1", "request-1")).rejects.toThrow(
      "Link de primeiro acesso só pode ser gerado para solicitações aprovadas.",
    );
  });

  it("rejects first-access email for non-approved requests", async () => {
    mock.setSelectResults([[requestRow]]);

    await expect(service.sendFirstAccessEmail("academy-1", "request-1")).rejects.toThrow(
      "Email só pode ser enviado para solicitações aprovadas.",
    );

    expect(emailService.send).not.toHaveBeenCalled();
  });

  it("regenerates a fresh first-access link before sending email", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T12:00:00.000Z"));
    try {
      mock.setSelectResults([[{ ...requestRow, status: "approved" }], [academyRow]]);

      await expect(service.sendFirstAccessEmail("academy-1", "request-1")).resolves.toEqual({
        sent: true,
      });

      expect(mock.updatedSets[0]).toMatchObject({
        firstAccessTokenHash: expect.any(String),
        firstAccessTokenExpiresAt: new Date("2026-06-03T12:00:00.000Z"),
        firstAccessConsumedAt: null,
      });
      expect(emailService.send).toHaveBeenCalledWith({
        to: "aluno@example.com",
        subject: "Seu acesso ao Tatame Central no Tatamiq",
        html: expect.stringContaining("Tatame Central"),
      });
      expect(emailService.send.mock.calls[0]?.[0].html).toContain("Aluno Teste");
      expect(emailService.send.mock.calls[0]?.[0].html).toContain("/student/first-access/");
    } finally {
      vi.useRealTimers();
    }
  });
});
