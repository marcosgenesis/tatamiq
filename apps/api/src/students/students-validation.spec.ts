import "reflect-metadata";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { StudentsController } from "./students.controller";

function bodyPipeFor(controller: object, method: string) {
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method) as
    | Record<string, { pipes?: unknown[] }>
    | undefined;
  const bodyParam = Object.values(metadata ?? {}).find((entry) => entry.pipes?.length);
  return bodyParam?.pipes?.[0] as { transform: (value: unknown, metadata: object) => unknown };
}

describe("StudentsController request validation", () => {
  it("rejects invalid create student birthDate before the service/DB path", () => {
    const pipe = bodyPipeFor(StudentsController, "create");

    expect(pipe).toBeDefined();
    expect(() =>
      pipe.transform(
        {
          name: "Aluno Teste",
          birthDate: "abc",
          enrollmentDate: "2026-06-03",
          currentBeltId: "belt-1",
          currentDegree: 0,
        },
        { type: "body" },
      ),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
