import { BadRequestException, Injectable } from "@nestjs/common";

export type EmailPayload = {
  from?: string;
  to: string;
  subject: string;
  html: string;
};

@Injectable()
export class EmailService {
  async send(payload: EmailPayload): Promise<void> {
    const emailPayload = {
      from: payload.from ?? emailFrom(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    };

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      if (!isLocalEmailFallbackAllowed(process.env)) {
        throw new BadRequestException("Envio de email não configurado.");
      }

      console.log({
        event: "email_dev_fallback",
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        htmlLength: emailPayload.html.length,
      });
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error({ event: "resend_email_failed", status: response.status, body: text });
      throw new BadRequestException("Não foi possível enviar o email.");
    }
  }
}

function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "Tatamiq <noreply@tatamiq.com.br>";
}

function isLocalEmailFallbackAllowed(env: NodeJS.ProcessEnv): boolean {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  return !nodeEnv || nodeEnv === "development" || nodeEnv === "test" || env.E2E === "true";
}
