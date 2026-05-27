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
      console.log({ event: "email_dev_fallback", ...emailPayload });
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
