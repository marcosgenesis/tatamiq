import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../main";

describe("GET /health", () => {
  it("returns an ok health response", async () => {
    const app = await createApp();
    await app.init();

    await request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe("ok");
        expect(new Date(response.body.timestamp).toString()).not.toBe("Invalid Date");
      });

    await app.close();
  });
});
