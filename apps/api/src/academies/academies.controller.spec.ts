import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { DATABASE } from "../database/database.module";
import { AcademiesController } from "./academies.controller";

describe("GET /academies/demo", () => {
  it("returns the demo academy from the database interface", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              { id: "00000000-0000-4000-8000-000000000000", name: "Academia Demo" },
            ],
          }),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AcademiesController],
      providers: [{ provide: DATABASE, useValue: db }],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .get("/academies/demo")
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          id: "00000000-0000-4000-8000-000000000000",
          name: "Academia Demo",
        });
      });

    await app.close();
  });
});
