import type { ScheduleOccurrence } from "@appdosensei/contracts";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TotemService } from "./totem.service";

type Row = Record<string, unknown>;

/** Mocks a drizzle `select().from().[innerJoin()].where().[limit()]` chain returning `rows`. */
function selectRows(rows: Row[]) {
  const tail = Object.assign(Promise.resolve(rows), { limit: vi.fn().mockResolvedValue(rows) });
  const where = vi.fn(() => tail);
  return { from: vi.fn(() => ({ where, innerJoin: vi.fn(() => ({ where })) })) };
}

function writeChain(result: unknown = { count: 1 }) {
  const where = vi.fn().mockResolvedValue(result);
  return { set: vi.fn(() => ({ where })), where, values: vi.fn().mockResolvedValue(undefined) };
}

function buildService(
  db: Record<string, unknown>,
  deps: Partial<{ classes: Row; schedule: Row }> = {},
) {
  return new TotemService(
    db as never,
    (deps.classes ?? {}) as never,
    (deps.schedule ?? {}) as never,
  );
}

const occurrence: ScheduleOccurrence = {
  id: "occ-1",
  source: "recurring",
  status: "scheduled",
  classGroupId: "cg-1",
  classGroupName: "Adulto",
  scheduleId: "sch-1",
  classSessionId: null,
  cancellationId: null,
  scheduledDate: "2026-08-26",
  scheduledStartAt: "2026-08-26T22:30:00.000Z",
  startTime: "19:30",
  durationMinutes: 60,
  studentCount: 10,
  attendanceCount: null,
  tags: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TotemService pairing", () => {
  it("invalidates previous unused codes when generating a new one", async () => {
    const update = vi.fn(() => writeChain());
    const insert = vi.fn(() => writeChain());
    const db = { update, insert, select: vi.fn(() => selectRows([])) };

    const result = await buildService(db).createPairingCode("org-1", "user-1");

    expect(update).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.expiresInMinutes).toBe(10);
  });

  it("rejects an unknown, used, or expired code", async () => {
    const db = { select: vi.fn(() => selectRows([])) };

    await expect(buildService(db).pair({ code: "123456", name: "" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects malformed codes before touching the database", async () => {
    const select = vi.fn();

    await expect(buildService({ select }).pair({ code: "abc", name: "" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(select).not.toHaveBeenCalled();
  });

  it("marks the code as used and creates the device in one transaction", async () => {
    const codeRow = {
      id: "code-1",
      organizationId: "org-1",
      createdByUserId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    };
    const txUpdate = vi.fn(() => writeChain());
    const txInsert = vi.fn(() => writeChain());
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([codeRow]))
        .mockReturnValueOnce(selectRows([{ name: "Academia X" }])),
      transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) =>
        callback({ update: txUpdate, insert: txInsert }),
      ),
    };

    const result = await buildService(db).pair({ code: "123456", name: "Recepção" });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(txInsert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ deviceName: "Recepção", academyName: "Academia X" });
    expect(result.deviceToken.length).toBeGreaterThan(30);
    const insertChain = txInsert.mock.results[0]?.value as ReturnType<typeof writeChain>;
    const inserted = insertChain.values.mock.calls[0]?.[0] as Row;
    expect(inserted.tokenHash).not.toBe(result.deviceToken);
  });
});

describe("TotemService authenticate", () => {
  it("rejects requests without a bearer token", async () => {
    await expect(buildService({}).authenticate(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects revoked or unknown devices", async () => {
    const db = { select: vi.fn(() => selectRows([])) };

    await expect(buildService(db).authenticate("Bearer abc")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects devices whose responsible lost access to the academy", async () => {
    const device = {
      id: "dev-1",
      organizationId: "org-1",
      pairedByUserId: "user-1",
      revokedAt: null,
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([device]))
        .mockReturnValueOnce(selectRows([])),
    };

    await expect(buildService(db).authenticate("Bearer abc")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("returns the device scope and updates lastSeenAt", async () => {
    const device = {
      id: "dev-1",
      organizationId: "org-1",
      pairedByUserId: "user-1",
      revokedAt: null,
    };
    const update = vi.fn(() => writeChain());
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([device]))
        .mockReturnValueOnce(selectRows([{ id: "m-1" }])),
      update,
    };

    const auth = await buildService(db).authenticate("Bearer abc");

    expect(auth).toEqual({ deviceId: "dev-1", organizationId: "org-1", pairedByUserId: "user-1" });
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe("TotemService start", () => {
  const auth = { deviceId: "dev-1", organizationId: "org-1", pairedByUserId: "user-1" };

  it("only starts occurrences scheduled for today", async () => {
    const schedule = {
      today: vi.fn().mockResolvedValue({ date: "2026-08-26", occurrences: [occurrence] }),
    };
    const classes = { startRecurring: vi.fn() };

    await expect(
      buildService({}, { classes, schedule }).start(auth, "other"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(classes.startRecurring).not.toHaveBeenCalled();
  });

  it("starts a recurring occurrence scoped to the device academy", async () => {
    const schedule = {
      today: vi.fn().mockResolvedValue({ date: "2026-08-26", occurrences: [occurrence] }),
    };
    const started = {
      id: "cs-1",
      classGroupId: "cg-1",
      classGroupName: "Adulto",
      kind: "recurring",
      status: "active",
      scheduledStartAt: occurrence.scheduledStartAt,
      actualStartAt: "2026-08-26T22:31:00.000Z",
      durationMinutes: 60,
      endedAt: null,
    };
    const classes = { startRecurring: vi.fn().mockResolvedValue(started) };

    const result = await buildService({}, { classes, schedule }).start(auth, "occ-1");

    expect(classes.startRecurring).toHaveBeenCalledWith("org-1", "user-1", {
      classGroupId: "cg-1",
      scheduleId: "sch-1",
      scheduledDate: "2026-08-26",
    });
    expect(result).toMatchObject({
      id: "cs-1",
      status: "active",
      actualStartAt: started.actualStartAt,
    });
  });
});

describe("TotemService qr", () => {
  const auth = { deviceId: "dev-1", organizationId: "org-1", pairedByUserId: "user-1" };

  it("points to the canonical student portal URL, never the totem origin", async () => {
    vi.stubEnv("STUDENT_PORTAL_URL", "https://app.tatamiq.com/");
    vi.stubEnv("TOTEM_APP_URL", "https://totem.tatamiq.com");
    const classes = {
      getQrToken: vi.fn().mockResolvedValue({
        token: "tok en",
        issuedAt: "2026-08-26T22:31:00.000Z",
        expiresAt: "2026-08-26T22:31:30.000Z",
      }),
    };

    const result = await buildService({}, { classes }).qr(auth, "cs-1");

    expect(classes.getQrToken).toHaveBeenCalledWith("org-1", "cs-1");
    expect(result.url).toBe("https://app.tatamiq.com/student/check-in?token=tok%20en");
    expect(result.url).not.toContain("totem.tatamiq.com");
  });
});
