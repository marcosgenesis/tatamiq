import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailService } from "./email.service";

const OLD_ENV = process.env;

describe("EmailService", () => {
  afterEach(() => {
    process.env = { ...OLD_ENV };
    vi.restoreAllMocks();
  });

  it("logs sanitized email metadata when RESEND_API_KEY is not configured", async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      RESEND_API_KEY: "",
      EMAIL_FROM: "Tatamiq <dev@example.com>",
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await new EmailService().send({
      to: "student@example.com",
      subject: "Primeiro acesso",
      html: "<p>Link</p>",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith({
      event: "email_dev_fallback",
      from: "Tatamiq <dev@example.com>",
      to: "student@example.com",
      subject: "Primeiro acesso",
      htmlLength: "<p>Link</p>".length,
    });
    expect(log.mock.calls[0]?.[0]).not.toHaveProperty("html");
  });

  it("does not log first-access URL or token material in the dev fallback", async () => {
    process.env = { ...OLD_ENV, NODE_ENV: "test", RESEND_API_KEY: "" };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const secretToken = "first-access-token-secret";

    await new EmailService().send({
      to: "student@example.com",
      subject: "Primeiro acesso",
      html: `<a href="https://app.example.com/student/first-access/${secretToken}">Acessar</a>`,
    });

    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(secretToken);
    expect(logged).not.toContain("/student/first-access/");
  });

  it("does not use the fallback in production-like environments", async () => {
    process.env = { ...OLD_ENV, NODE_ENV: "production", RESEND_API_KEY: "" };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(
      new EmailService().send({
        to: "student@example.com",
        subject: "Primeiro acesso",
        html: "<p>Link</p>",
      }),
    ).rejects.toThrow("Envio de email não configurado.");

    expect(log).not.toHaveBeenCalled();
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
