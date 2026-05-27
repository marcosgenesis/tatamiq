import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailService } from "./email.service";

const OLD_ENV = process.env;

describe("EmailService", () => {
  afterEach(() => {
    process.env = { ...OLD_ENV };
    vi.restoreAllMocks();
  });

  it("logs the email payload when RESEND_API_KEY is not configured", async () => {
    process.env = { ...OLD_ENV, RESEND_API_KEY: "", EMAIL_FROM: "Tatamiq <dev@example.com>" };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await new EmailService().send({
      to: "student@example.com",
      subject: "Primeiro acesso",
      html: "<p>Link</p>",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "email_dev_fallback",
        from: "Tatamiq <dev@example.com>",
        to: "student@example.com",
        subject: "Primeiro acesso",
        html: "<p>Link</p>",
      }),
    );
  });

  it("sends through Resend when RESEND_API_KEY is configured", async () => {
    process.env = {
      ...OLD_ENV,
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "Tatamiq <mail@example.com>",
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    await new EmailService().send({
      to: "student@example.com",
      subject: "Primeiro acesso",
      html: "<p>Link</p>",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Tatamiq <mail@example.com>",
          to: "student@example.com",
          subject: "Primeiro acesso",
          html: "<p>Link</p>",
        }),
      }),
    );
  });

  it("throws a friendly error when Resend rejects the request", async () => {
    process.env = { ...OLD_ENV, RESEND_API_KEY: "test-key" };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    } as Response);

    await expect(
      new EmailService().send({
        to: "student@example.com",
        subject: "Primeiro acesso",
        html: "<p>Link</p>",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
